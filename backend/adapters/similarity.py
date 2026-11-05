"""Uniqueness-check adapter. Phase 1: wording similarity (difflib on word sequences + trigram overlap)."""

import os
import re
from difflib import SequenceMatcher
from typing import Iterable, Protocol, Tuple

_WORD = re.compile(r"[a-z0-9\u0900-\u097f']+")


def _words(text: str) -> list[str]:
    return _WORD.findall(text.lower())


class SimilarityChecker(Protocol):
    def score(self, a: str, b: str) -> float: ...
    def most_similar(self, text: str, corpus: Iterable[str]) -> Tuple[float, str]: ...


class LexicalSimilarity:
    def score(self, a: str, b: str) -> float:
        wa, wb = _words(a), _words(b)
        if not wa or not wb:
            return 0.0
        seq = SequenceMatcher(None, wa, wb, autojunk=False).ratio()
        ta = {tuple(wa[i : i + 3]) for i in range(max(len(wa) - 2, 1))}
        tb = {tuple(wb[i : i + 3]) for i in range(max(len(wb) - 2, 1))}
        jac = len(ta & tb) / len(ta | tb) if ta | tb else 0.0
        return max(seq, jac)

    def most_similar(self, text: str, corpus: Iterable[str]) -> Tuple[float, str]:
        best, match = 0.0, ""
        for other in corpus:
            s = self.score(text, other)
            if s > best:
                best, match = s, other
        return best, match


_CHECKERS = {"lexical": LexicalSimilarity}


def get_similarity() -> SimilarityChecker:
    return _CHECKERS[os.environ.get("SIMILARITY_ADAPTER", "lexical")]()
