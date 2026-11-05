"""Idempotent seed: sample Petpooja order. Run: cd /app/backend && python seed.py"""

import asyncio

from lib.db import db, ensure_indexes

SAMPLE_ORDERS = [
    {
        "petpooja_order_id": "PP-98214",
        "restaurant_name": "Mana Restaurant",
        "location": "Shankarpally",
        "order_items": [
            {"itemid": "PP_101", "itemname": "Special Chicken Biryani", "category": "Main Course"},
            {"itemid": "PP_204", "itemname": "Paneer Tikka", "category": "Starters"},
            {"itemid": "PP_301", "itemname": "Butter Naan", "category": "Breads"},
        ],
    }
]


async def main() -> None:
    await ensure_indexes()
    for order in SAMPLE_ORDERS:
        await db.petpooja_orders.update_one(
            {"petpooja_order_id": order["petpooja_order_id"]}, {"$set": order}, upsert=True
        )
    print(f"Seeded {len(SAMPLE_ORDERS)} order(s)")


if __name__ == "__main__":
    asyncio.run(main())
