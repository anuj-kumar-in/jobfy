def should_apply(score, applied_count):
    if score >= 0.75:
        return True
    if score >= 0.60 and applied_count < 3:
        return True
    return False
