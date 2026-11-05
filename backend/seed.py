"""Idempotent seed (also runs automatically at backend startup). Run: cd /app/backend && python seed.py"""

import asyncio

from lib.bootstrap import bootstrap
from lib.db import ensure_indexes


async def main() -> None:
    await ensure_indexes()
    await bootstrap()
    print("Seeded super-admin, demo owner, Kaka + Mana restaurants")


if __name__ == "__main__":
    asyncio.run(main())
