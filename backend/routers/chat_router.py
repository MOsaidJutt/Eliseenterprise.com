import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def _build_context(result: dict) -> str:
    """Build a compact text context from analysis result for GPT injection."""
    kpis = result.get("kpis", {})
    lines = [
        f"Project: {kpis.get('project_name', 'Unknown')}",
        f"Data Date: {kpis.get('data_date', 'Unknown')}",
        f"Overall Progress: {kpis.get('overall_pct_complete', 0)}%",
        f"SPI: {kpis.get('spi', 'N/A')}",
        f"Delay vs Baseline: {kpis.get('delay_days', 0)} days",
        f"Total Activities: {kpis.get('total_activities', 0)}",
        f"Completed: {kpis.get('completed_activities', 0)}",
        f"In Progress: {kpis.get('in_progress_activities', 0)}",
        f"Critical Activities: {kpis.get('critical_activities', 0)}",
        f"Critical Path Risk: {kpis.get('critical_path_risk_pct', 0)}%",
        f"Negative Float Activities: {kpis.get('neg_float_activities', 0)}",
        f"Planned End: {kpis.get('planned_end', 'N/A')}",
        f"Forecast End: {kpis.get('forecast_end', 'N/A')}",
    ]

    milestones = result.get("milestones", [])
    if milestones:
        lines.append("\nKey Milestones:")
        for m in milestones[:10]:
            lines.append(
                f"  - {m.get('task_name', '')}: baseline {m.get('baseline', '')}, "
                f"status {m.get('status', '')}, variance {m.get('variance_days', 0)}d"
            )

    critical = result.get("critical_path", [])
    if critical:
        lines.append("\nTop Critical Path Activities:")
        for c in critical[:10]:
            lines.append(
                f"  - {c.get('task_name', '')} [{c.get('task_code', '')}]: "
                f"float {c.get('total_float_days', 0)}d, {c.get('pct_complete', 0)}% complete"
            )

    obs = result.get("observations", [])
    if obs:
        lines.append("\nKey Observations:")
        for o in obs:
            lines.append(f"  - {o}")

    fe = result.get("float_erosion", [])
    if fe:
        lines.append(f"\nFloat Erosion: {fe[0].get('eroded_float_days', 0)} days consumed "
                     f"across {fe[0].get('eroded_activities', 0)} activities.")

    return "\n".join(lines)


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

    # Load analysis context
    context_str = ""
    if body.analysis_id:
        result = await db.execute(
            select(models.Analysis).where(
                models.Analysis.id == body.analysis_id,
                models.Analysis.company_id == user.company_id,
            )
        )
        analysis = result.scalar_one_or_none()
        if analysis:
            context_str = _build_context(analysis.result)

    # Get or create conversation
    conversation: Optional[models.AIConversation] = None
    if body.conversation_id:
        conv_result = await db.execute(
            select(models.AIConversation).where(
                models.AIConversation.id == body.conversation_id,
                models.AIConversation.user_id == user.id,
            )
        )
        conversation = conv_result.scalar_one_or_none()

    if not conversation:
        title = body.message[:60] + ("…" if len(body.message) > 60 else "")
        conversation = models.AIConversation(
            user_id=user.id,
            analysis_id=body.analysis_id,
            title=title,
        )
        db.add(conversation)
        await db.flush()

    # If no analysis data is loaded, return a synthetic response without calling OpenAI
    if not context_str:
        no_data_reply = (
            "No schedule data is currently loaded. "
            "Please select an analysis from the history panel or upload a new XER file to get started."
        )
        user_msg = models.AIMessage(conversation_id=conversation.id, role="user", content=body.message)
        assistant_msg = models.AIMessage(conversation_id=conversation.id, role="assistant", content=no_data_reply)
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)
        return schemas.ChatResponse(reply=no_data_reply, conversation_id=conversation.id, message_id=assistant_msg.id)

    # Build message history for GPT
    history_result = await db.execute(
        select(models.AIMessage)
        .where(models.AIMessage.conversation_id == conversation.id)
        .order_by(models.AIMessage.created_at)
        .limit(20)
    )
    history = history_result.scalars().all()

    system_prompt = (
        "You are a schedule analytics assistant for Primavera P6 project data. "
        "You ONLY answer questions based on the specific schedule data provided below. "
        "Do NOT use general knowledge or outside information. "
        "If a question cannot be answered from the data, respond: "
        "'I can only answer questions about the schedule data that has been loaded.' "
        "Always cite specific numbers, dates, and activity names from the data. "
        "Be concise and professional.\n\n"
        f"--- SCHEDULE DATA ---\n{context_str}\n--- END DATA ---"
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    # Call OpenAI
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=1024,
        temperature=0.3,
    )
    reply_text = response.choices[0].message.content

    # Save user message + assistant reply
    user_msg = models.AIMessage(conversation_id=conversation.id, role="user", content=body.message)
    assistant_msg = models.AIMessage(conversation_id=conversation.id, role="assistant", content=reply_text)
    db.add(user_msg)
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

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
        select(models.AIConversation).where(
            models.AIConversation.id == conversation_id,
            models.AIConversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs_result = await db.execute(
        select(models.AIMessage)
        .where(models.AIMessage.conversation_id == conv.id)
        .order_by(models.AIMessage.created_at)
    )
    conv.messages = msgs_result.scalars().all()
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
