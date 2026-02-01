def should_apply(score, applied_count):
    """Policy for deciding whether to apply to a job.

    Adjusted thresholds to allow applications when frontend shows ~20%:
    - Apply if score >= 0.25
    - Otherwise apply if score >= 0.15 and applied_count < 10
    """
    if score >= 0.25:
        return True
    if score >= 0.15 and applied_count < 10:
        return True
    return False
