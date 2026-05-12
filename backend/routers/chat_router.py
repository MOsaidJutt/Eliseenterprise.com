import os, json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


@router.post("", response_model=schemas.ChatResponse)
async def chat(
    body: schemas.ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI chat is not configured (missing OPENAI_API_KEY)")

    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    # Load analysis data
    context_str = ""
    if body.analysis_id:
        q = select(models.Analysis).where(models.Analysis.id == body.analysis_id)
        res = await db.execute(q)
        analysis = res.scalar_one_or_none()
        if analysis and analysis.result:
            # Dump full result as JSON so the AI has everything
            raw = json.dumps(analysis.result, default=str)
            # Truncate to ~6000 chars to stay within token limits
            context_str = raw[:6000]

    # Get or create conversation
    conversation: Optional[models.AIConversation] = None
    if body.conversation_id:
        conv_res = await db.execute(
            select(models.AIConversation).where(
                models.AIConversation.id == body.conversation_id,
                models.AIConversation.user_id == user.id,
            )
        )
        conversation = conv_res.scalar_one_or_none()

    if not conversation:
        title = body.message[:60] + ("…" if len(body.message) > 60 else "")
        conversation = models.AIConversation(
            user_id=user.id,
            analysis_id=body.analysis_id,
            title=title,
        )
        db.add(conversation)
        await db.flush()

    # Build message history (last 20 messages for context)
    history_res = await db.execute(
        select(models.AIMessage)
        .where(models.AIMessage.conversation_id == conversation.id)
        .order_by(models.AIMessage.created_at)
        .limit(20)
    )
    history = history_res.scalars().all()

    # System prompt
    if context_str:
        system_prompt = (
            "You are an expert Primavera P6 schedule analyst. "
            "You have access to the project's schedule data below. "
            "Answer questions about the schedule, explain findings, and give practical insights. "
            "You may also explain general schedule analysis concepts (like what float, SPI, or critical path means) "
            "as they relate to this project's data. "
            "Always reference specific numbers, dates, or activity names from the data when relevant. "
            "Be concise and professional.\n\n"
            f"--- SCHEDULE DATA (JSON) ---\n{context_str}\n--- END DATA ---"
        )
    else:
        system_prompt = (
            "You are an expert Primavera P6 schedule analyst. "
            "No schedule data is currently loaded. "
            "Ask the user to select an analysis from the history panel or upload a new XER file."
        )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
        )
        reply_text = response.choices[0].message.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(exc)}")

    # Save messages
    db.add(models.AIMessage(conversation_id=conversation.id, role="user", content=body.message))
    db.add(models.AIMessage(conversation_id=conversation.id, role="assistant", content=reply_text))
    await db.commit()

    # Get the saved assistant message id
    msg_res = await db.execute(
        select(models.AIMessage)
        .where(
            models.AIMessage.conversation_id == conversation.id,
            models.AIMessage.role == "assistant",
        )
        .order_by(desc(models.AIMessage.created_at))
        .limit(1)
    )
    assistant_msg = msg_res.scalar_one()

    return schemas.ChatResponse(
        reply=reply_text,
        conversation_id=conversation.id,
        message_id=assistant_msg.id,
    )


@router.get("/conversations", response_model=list[schemas.ConversationListItem])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.AIConversation)
        .where(models.AIConversation.user_id == user.id)
        .order_by(desc(models.AIConversation.created_at))
        .limit(50)
    )
    return result.scalars().all()


@router.get("/conversations/{conversation_id}", response_model=schemas.ConversationDetailResponse)
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.AIConversation)
        .options(selectinload(models.AIConversation.messages))
        .where(
            models.AIConversation.id == conversation_id,
            models.AIConversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.AIConversation).where(
            models.AIConversation.id == conversation_id,
            models.AIConversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
    return {"ok": True}
