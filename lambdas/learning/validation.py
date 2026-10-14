"""Pure validation and scoring rules shared by APIs and unit tests."""
import math
import uuid


class ApiError(Exception):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)


def identifier(value):
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        raise ApiError(400, "A valid UUID is required")


def integer(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ApiError(400, f"{name} must be an integer between {low} and {high}")
    return value


def number(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ApiError(400, f"{name} must be a number between {low} and {high}")
    return float(value)


def text(value, name, maximum=2000):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ApiError(400, f"{name} is required and must be at most {maximum} characters")
    return value.strip()


def questions(value):
    if not isinstance(value, list) or not 1 <= len(value) <= 100:
        raise ApiError(400, "An exam needs between 1 and 100 questions")
    result = []
    for item in value:
        if not isinstance(item, dict):
            raise ApiError(400, "Questions must be objects")
        options = item.get("options")
        if not isinstance(options, list) or not 2 <= len(options) <= 8:
            raise ApiError(400, "Each question needs between 2 and 8 options")
        clean = [{"id": text(o.get("id"), "option id", 40), "label": text(o.get("label"), "option label", 1000)} for o in options if isinstance(o, dict)]
        ids = [o["id"] for o in clean]
        if len(clean) != len(options) or len(set(ids)) != len(ids) or item.get("correct_option_id") not in ids:
            raise ApiError(400, "Options must have unique IDs and include the correct option")
        result.append({"id": str(uuid.uuid4()), "question": text(item.get("question"), "question"), "options": clean,
                       "correct_option_id": item["correct_option_id"], "points": integer(item.get("points", 1), 1, 100, "points")})
    return result


def merge_ranges(ranges, start, end):
    merged = []
    for a, b in sorted([*ranges, [start, end]]):
        if b <= a:
            continue
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    return merged


def watched_update(ranges, previous, position, elapsed, duration):
    position = number(position, 0, duration, "position_seconds")
    advance = position - previous
    # Seeking does not earn watch credit. Overlapping replays are counted once.
    if advance > 0 and advance <= max(0, elapsed) * 1.5 + 2:
        ranges = merge_ranges(ranges, previous, position)
    watched = min(duration, sum(b - a for a, b in ranges))
    return ranges, watched, watched >= duration * 0.9


def score(snapshot, answers):
    if not isinstance(answers, dict):
        raise ApiError(400, "answers must be an object keyed by question ID")
    valid = {q["id"]: q for q in snapshot}
    if any(qid not in valid or answer not in [o["id"] for o in valid[qid]["options"]] for qid, answer in answers.items()):
        raise ApiError(400, "Unknown question or option in answers")
    earned = sum(q["points"] for q in snapshot if answers.get(q["id"]) == q["correct_option_id"])
    maximum = sum(q["points"] for q in snapshot)
    return earned, maximum, round(earned * 100 / maximum, 2)
