import os
import re

with open("backend/main.py", "r", encoding="utf-8") as f:
    text = f.read()

# Add imports
text = text.replace("    add_journeys,\n    get_all_journeys,\n)", "    add_journeys,\n    get_all_journeys,\n    add_value_streams,\n    get_all_value_streams,\n)")

# Add payload
text = text.replace("class JourneysPayload(BaseModel):\n    journeys: list[dict]", "class JourneysPayload(BaseModel):\n    journeys: list[dict]\n\nclass ValueStreamsPayload(BaseModel):\n    value_streams: list[dict]")

# Add endpoints
parts = text.split("# LANGGRAPH ENDPOINTS")
if len(parts) == 2:
    new_text = parts[0] + """
# ─── Value Streams ────────────────────────────────────────────────────────

@app.post("/api/config/value_streams")
async def upload_value_streams(
    payload: ValueStreamsPayload,
    user: UserInfo = Depends(get_current_user),
):
    \"\"\"Upload value stream records to the user's Firestore knowledge base.\"\"\"
    count = add_value_streams(user.user_id, payload.value_streams)
    return {"message": f"{count} value streams saved.", "user_id": user.user_id}


@app.get("/api/config/value_streams")
async def list_value_streams(user: UserInfo = Depends(get_current_user)):
    \"\"\"Retrieve all value streams for the authenticated user.\"\"\"
    streams = list(get_all_value_streams(user.user_id))
    return {"value_streams": [s.to_dict() for s in streams], "count": len(streams)}

# LANGGRAPH ENDPOINTS""" + parts[1]
    
    with open("backend/main.py", "w", encoding="utf-8") as f:
        f.write(new_text)
    print("Done writing backend/main.py")
else:
    print("Could not find LangGraph separator")