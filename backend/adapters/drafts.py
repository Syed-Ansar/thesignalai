"""AI review-drafting adapter. Swap providers by adding a class and setting DRAFT_ADAPTER."""

import os
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import List, Protocol

from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

# tone key -> (label shown to guests, writing instruction)
TONES = {
    "foodie": ("Foodie", "Descriptive & detailed: 3-5 sentences, specific about dishes, taste and service."),
    "crisp": ("Quick & Crisp", "Short & direct: 1-2 punchy sentences, max ~30 words."),
    "desi": (
        "Desi Mix",
        "Warm & casual Hinglish/English mix in Roman script (words like ekdum, bahut, mast, zabardast, paisa vasool), 2-4 sentences, max 1 emoji.",
    ),
}

SYSTEM_PROMPT = """You write ONE Google review draft for a real guest of an Indian restaurant.
Return ONLY the review text. No quotes, no markdown, no title.
Rules:
- Sound like a real local guest, first person, natural and specific.
- NEVER use clichés: "I recently dined at", "I recently visited", "strive for excellence", "culinary journey", "hidden gem", "tantalizing", "delightful experience", "exceeded my expectations", "look no further".
- Only mention what the guest selected or wrote; do not invent prices, staff names or facts.
- No hashtags. Never include phone numbers, emails or bill numbers."""

OPENERS = [
    "start with the food", "start with how the visit felt", "start with a dish name",
    "start with who you came with", "start with the service", "start with a short exclamation",
]


@dataclass
class DraftContext:
    restaurant: str
    location: str
    rating: int
    dishes: List[str] = field(default_factory=list)
    vibes: List[str] = field(default_factory=list)
    note: str = ""


class DraftWriter(Protocol):
    async def write(self, ctx: DraftContext, tone: str) -> str: ...
    async def rewrite(self, text: str, tone: str, ctx: DraftContext, avoid: str) -> str: ...


def _clean(raw: str) -> str:
    return raw.strip().strip("`").strip().strip('"').strip()


class EmergentOpenAIWriter:
    def __init__(self) -> None:
        self.model = os.environ.get("DRAFT_MODEL", "gpt-4o-mini")
        self.temperature = 0.9

    async def _complete(self, system: str, prompt: str) -> str:
        chat = (
            LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"draft-{uuid.uuid4()}", system_message=system)
            .with_model("openai", self.model)
            .with_params(temperature=self.temperature)
        )
        out = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                out += ev.content
            elif isinstance(ev, StreamDone):
                break
        return out

    @staticmethod
    def _facts(ctx: DraftContext) -> str:
        return (
            f"Restaurant: {ctx.restaurant}{', ' + ctx.location if ctx.location else ''}.\n"
            f"Star rating: {ctx.rating}/5.\n"
            f"Dishes enjoyed: {', '.join(ctx.dishes) or 'not specified'}.\n"
            f"Liked about the visit: {', '.join(ctx.vibes) or 'not specified'}.\n"
            f"Guest note: {ctx.note or 'none'}.\n"
        )

    async def write(self, ctx: DraftContext, tone: str) -> str:
        seed = int(time.time() * 1000) % 100000  # time-based variation seed so drafts don't repeat
        prompt = (
            self._facts(ctx)
            + f"Tone: {TONES[tone][1]}\nVariation seed: {seed}. Opening: {random.choice(OPENERS)}.\nWrite the review now."
        )
        return _clean(await self._complete(SYSTEM_PROMPT, prompt))

    async def rewrite(self, text: str, tone: str, ctx: DraftContext, avoid: str) -> str:
        system = (
            "You rewrite a guest's Google review so it is clearly different in wording and structure from an "
            "existing review, while keeping the same facts and tone. Return ONLY the rewritten review text. "
            "No clichés, no phone numbers, emails or bill numbers."
        )
        prompt = (
            self._facts(ctx)
            + f"Tone: {TONES[tone][1]}\nDraft to rewrite:\n{text}\n\nToo similar to this existing review (avoid its phrasing):\n{avoid[:600]}\n"
            f"Variation seed: {int(time.time() * 1000) % 100000}. Use a different opening and different word choices."
        )
        return _clean(await self._complete(system, prompt))


_WRITERS = {"emergent_openai": EmergentOpenAIWriter}


def get_draft_writer() -> DraftWriter:
    return _WRITERS[os.environ.get("DRAFT_ADAPTER", "emergent_openai")]()
