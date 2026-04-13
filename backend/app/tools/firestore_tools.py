"""
LangChain Tools — Phase 2: Dynamic Firestore Data Layer

These tools are injected into the LangGraph sub-agents so they can query
user-specific Firestore collections during the analysis pipeline.

Prompt: "Create tools.py using the LangChain @tool decorator. Write three
tools that query user-specific Firestore collections: search_capability_kb
for capabilities, get_product_owner for products, and get_journey_steps for
journeys. Each tool MUST require user_id as a parameter to enforce data
isolation. Use fuzzy string matching (difflib) for semantic search since
Firestore REST API doesn't support full-text search natively. If no match
is found, return instructions for the LLM to flag the item appropriately."
"""

from difflib import SequenceMatcher
from langchain_core.tools import tool
from app.firebase_config import get_firestore_client


def _fuzzy_match(query: str, candidates: list[dict], key: str, threshold: float = 0.4) -> list[dict]:
    """
    Perform fuzzy string matching against a list of dicts.
    Returns all candidates above the similarity threshold, sorted by score.
    """
    results = []
    query_lower = query.lower()
    for item in candidates:
        target = item.get(key, "").lower()
        # Check exact substring match first
        if query_lower in target or target in query_lower:
            results.append({**item, "_score": 1.0})
            continue
        # Fall back to sequence matching
        score = SequenceMatcher(None, query_lower, target).ratio()
        if score >= threshold:
            results.append({**item, "_score": score})
    
    # Also check description field if present
    if not results:
        for item in candidates:
            desc = item.get("description", "").lower()
            if query_lower in desc:
                results.append({**item, "_score": 0.8})
                continue
            score = SequenceMatcher(None, query_lower, desc).ratio()
            if score >= threshold:
                results.append({**item, "_score": score})
    
    results.sort(key=lambda x: x["_score"], reverse=True)
    return results


@tool
def search_capability_kb(query: str, user_id: str) -> str:
    """
    Search the user's capability knowledge base for a matching capability.
    
    Args:
        query: The capability name or description to search for.
        user_id: The authenticated user's ID (required for data isolation).
    
    Returns:
        A string describing the matched capability, or an instruction to
        flag it as (New) if no match is found.
    """
    db = get_firestore_client()
    coll = db.document(f"users/{user_id}").collection("capabilities")
    
    try:
        all_capabilities = coll.stream()
    except Exception as e:
        return f"Error querying capabilities: {str(e)}"
    
    if not all_capabilities:
        return (
            f"No capabilities found in the knowledge base for this user. "
            f"The capability '{query}' should be flagged as (New)."
        )
    
    matches = _fuzzy_match(query, all_capabilities, key="name")
    
    if matches:
        best = matches[0]
        name = best.get("name", "Unknown")
        description = best.get("description", "No description")
        score = best.get("_score", 0)
        
        result = f"MATCH FOUND — Capability: {name}\n"
        result += f"Description: {description}\n"
        result += f"Match confidence: {score:.0%}\n"
        
        if len(matches) > 1:
            result += f"Other possible matches: {', '.join(m.get('name', '') for m in matches[1:3])}"
        
        return result
    else:
        return (
            f"NO MATCH found for '{query}' in the user's capability knowledge base. "
            f"This capability MUST be flagged as (New) in the output. "
            f"Available capabilities: {', '.join(c.get('name', '') for c in all_capabilities[:10])}"
        )


@tool
def get_product_owner(action_keyword: str, user_id: str) -> str:
    """
    Find the product owner for a given system action or functionality.
    Uses semantic bridging to match functional verbs to product descriptions.
    
    Args:
        action_keyword: The system action or functional keyword to search for.
        user_id: The authenticated user's ID (required for data isolation).
    
    Returns:
        Product details including owner, or 'NA' if no owner is found.
    """
    db = get_firestore_client()
    coll = db.document(f"users/{user_id}").collection("products")
    
    try:
        all_products = coll.stream()
    except Exception as e:
        return f"Error querying products: {str(e)}"
    
    if not all_products:
        return "NA — No products configured in the user's knowledge base."
    
    # Search by name first, then by description for semantic matching
    matches = _fuzzy_match(action_keyword, all_products, key="name")
    
    if not matches:
        matches = _fuzzy_match(action_keyword, all_products, key="description", threshold=0.3)
    
    if matches:
        best = matches[0]
        name = best.get("name", "Unknown")
        owner = best.get("owner", "NA")
        product_group = best.get("product_group", "")
        product_area = best.get("product_area", "")
        description = best.get("description", "")
        
        result = f"Product: {name}\n"
        result += f"Owner: {owner}\n"
        if product_group:
            result += f"Product Group: {product_group}\n"
        if product_area:
            result += f"Product Area: {product_area}\n"
        if description:
            result += f"Description: {description}\n"
        result += f"Match confidence: {best.get('_score', 0):.0%}"
        
        return result
    else:
        return (
            f"NA — No product match found for '{action_keyword}'. "
            f"The Owner field must state exactly 'NA'. "
            f"Available products: {', '.join(p.get('name', '') for p in all_products[:10])}"
        )


@tool
def get_journey_steps(journey_name: str, user_id: str) -> str:
    """
    Fetch the customer journey framework steps for a given journey.
    
    Args:
        journey_name: The name of the journey to look up.
        user_id: The authenticated user's ID (required for data isolation).
    
    Returns:
        A formatted list of journey steps, or a message if no journey is found.
    """
    db = get_firestore_client()
    coll = db.document(f"users/{user_id}").collection("journeys")
    
    try:
        all_journeys = coll.stream()
    except Exception as e:
        return f"Error querying journeys: {str(e)}"
    
    if not all_journeys:
        return (
            f"No journeys configured in the user's knowledge base. "
            f"Use a generic customer journey framework for '{journey_name}'."
        )
    
    matches = _fuzzy_match(journey_name, all_journeys, key="name")
    
    if matches:
        best = matches[0]
        name = best.get("name", "Unknown")
        steps = best.get("steps", [])
        
        result = f"Journey: {name}\n"
        result += f"Total Steps: {len(steps)}\n\n"
        
        if isinstance(steps, list):
            for i, step in enumerate(steps, 1):
                if isinstance(step, dict):
                    step_name = step.get("step_name", f"Step {i}")
                    step_desc = step.get("description", "")
                    result += f"  {i}. {step_name}"
                    if step_desc:
                        result += f" — {step_desc}"
                    result += "\n"
                else:
                    result += f"  {i}. {step}\n"
        
        return result
    else:
        return (
            f"No matching journey found for '{journey_name}'. "
            f"Available journeys: {', '.join(j.get('name', '') for j in all_journeys[:10])}. "
            f"Use a generic customer journey framework."
        )