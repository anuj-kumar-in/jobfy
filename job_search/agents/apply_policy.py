def should_apply(score, applied_count):
    """Policy for deciding whether to apply to a job.

    Threshold 0.40 with early-queue bonus:
    - Apply if score >= 0.40 (standard threshold)
    - Apply if score >= 0.30 and applied_count < 5 (lower threshold early on)
    """
    if score >= 0.40:
        return True
    if score >= 0.30 and applied_count < 5:
        return True
    return False
