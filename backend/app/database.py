"""
Database helper module.
Works with the REST-based Firestore client.
"""

from app.firebase_config import get_firestore_client


def get_user_collection(user_id: str, collection_name: str):
    db = get_firestore_client()
    return db.document(f"users/{user_id}").collection(collection_name)


def add_capabilities(user_id: str, capabilities: list[dict]) -> int:
    coll = get_user_collection(user_id, "capabilities")
    count = 0
    for cap in capabilities:
        coll.add(cap)
        count += 1
    return count


def get_all_capabilities(user_id: str) -> list[dict]:
    coll = get_user_collection(user_id, "capabilities")
    return coll.stream()


def add_products(user_id: str, products: list[dict]) -> int:
    coll = get_user_collection(user_id, "products")
    count = 0
    for prod in products:
        coll.add(prod)
        count += 1
    return count


def get_all_products(user_id: str) -> list[dict]:
    coll = get_user_collection(user_id, "products")
    return coll.stream()


def add_journeys(user_id: str, journeys: list[dict]) -> int:
    coll = get_user_collection(user_id, "journeys")
    count = 0
    for journey in journeys:
        coll.add(journey)
        count += 1
    return count


def get_all_journeys(user_id: str) -> list[dict]:
    coll = get_user_collection(user_id, "journeys")
    return coll.stream()


def add_value_streams(user_id: str, value_streams: list[dict]) -> int:
    coll = get_user_collection(user_id, "value_streams")
    count = 0
    for stream in value_streams:
        coll.add(stream)
        count += 1
    return count


def get_all_value_streams(user_id: str) -> list[dict]:
    coll = get_user_collection(user_id, "value_streams")
    return coll.stream()