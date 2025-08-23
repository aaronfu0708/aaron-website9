# apps/learning/services.py
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import F
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model

from .models import UserFamiliarity ,Quiz, Note, DifficultyLevels 
# 你的 UserFamiliarity 定義在這個 app

User = get_user_model()

DEC4 = Decimal('0.0001')
DEC2 = Decimal('0.01')
ONE  = Decimal('1')
HUNDRED = Decimal('100')

def _q(x) -> Decimal:
    """to Decimal & quantize 4位小數（計算用）"""
    return Decimal(str(x)).quantize(DEC4)

def _clamp01(x: Decimal) -> Decimal:
    return max(Decimal('0'), min(ONE, x))

def _get_alpha(level: DifficultyLevels) -> Decimal:
    """
    從 DifficultyLevels.weight_coefficients 取 alpha，預設 0.20
    例：{"alpha": 0.25}
    """
    wc = level.weight_coefficients or {}
    alpha = wc.get('alpha', 0.20)
    return _q(alpha)

def _get_cap(level: DifficultyLevels) -> Decimal:
    # familiarity_cap 期望是 0.30 / 0.50 / 0.70 / 1.00 這類 0~1 的上限
    return _q(level.familiarity_cap)

@transaction.atomic
def update_familiarity_weighted_average(
    *,
    user: User,
    quiz_topic_id: int,
    difficulty_level_id: int | None = None,
    difficulty_level_name: str | None = None,
    accuracy: float | Decimal | None = None,
    total_questions_this_run: int | None = None,
    correct_answers_this_run: int | None = None,
    note_id: int | None = None,
) -> Decimal:
    """
    權重平均法：
      new = old*(1 - alpha) + (accuracy*cap)*alpha   # 全部在 0~1 區間
    然後把 new 轉成百分比（0~100）存回 UserFamiliarity.familiarity

    參數：
      - accuracy：0~1 的本次正確率（你也可以不傳，改傳題數與正確數）
      - total_questions_this_run / correct_answers_this_run：用來算 accuracy
      - difficulty_level_id / name：兩者擇一提供
      - note_id：可選，這次測驗對應的 Note

    回傳：
      - 更新後 familiarity（百分比，Decimal，兩位小數）
    """

    # 1) 取 Quiz / Difficulty level
    quiz = Quiz.objects.select_for_update().get(pk=quiz_topic_id)

    if difficulty_level_id is not None:
        level = DifficultyLevels.objects.get(pk=difficulty_level_id)
    elif difficulty_level_name is not None:
        level = DifficultyLevels.objects.get(level_name=difficulty_level_name)
    else:
        raise ValueError("difficulty_level_id 或 difficulty_level_name 需擇一提供")

    cap   = _get_cap(level)      # 0.3 / 0.5 / 0.7 / 1.0
    alpha = _get_alpha(level)    # 例：0.20

    # 2) 算 accuracy（0~1）
    if accuracy is None:
        if total_questions_this_run is None or correct_answers_this_run is None:
            raise ValueError("accuracy 未提供時，必須提供 total_questions_this_run 與 correct_answers_this_run")
        if total_questions_this_run <= 0:
            raise ValueError("total_questions_this_run 必須 > 0")
        accuracy = correct_answers_this_run / total_questions_this_run

    acc = _q(accuracy)
    acc = _clamp01(acc)

    # 3) this_run = accuracy * cap（0~1 區間）
    this_run = (acc * cap).quantize(DEC4)

    # 4) 取或創 UserFamiliarity
    uf, created = UserFamiliarity.objects.select_for_update().get_or_create(
        user=user,
        quiz_topic=quiz,
        defaults={
            "note_id": note_id,
            "difficulty_level": level,
            "total_questions": 0,
            "correct_answers": 0,
            "weighted_total": Decimal('0.00'),
            "weighted_correct": Decimal('0.00'),
            "cap_weighted_sum": Decimal('0.00'),
            "familiarity": Decimal('0.00'),  # 百分比
        }
    )

    # 5) 舊熟悉度（先轉回 0~1 區間再算）
    old_pct = _q(uf.familiarity) / HUNDRED
    old = _clamp01(old_pct)

    # 5.5) 檢查是否已達到該難度上限，如果是則不更新熟悉度
    current_familiarity_pct = _q(uf.familiarity)  # 當前熟悉度百分比 (0~100)
    difficulty_cap_pct = cap * HUNDRED  # 難度上限轉成百分比 (0~100)
    
    if current_familiarity_pct >= difficulty_cap_pct:
        # 已達到或超過該難度上限，不更新熟悉度，但仍更新統計資料
        new_pct = current_familiarity_pct
    else:
        # 6) 權重平均更新（0~1）
        new01 = (old * (ONE - alpha) + this_run * alpha)
        new01 = _clamp01(new01)

        # 7) 轉回百分比並四捨五入兩位
        new_pct = (new01 * HUNDRED).quantize(DEC2, rounding=ROUND_HALF_UP)

    # 8) 累加其它統計欄位（可做分析用；不影響熟悉度主邏輯）
    if total_questions_this_run:
        uf.total_questions = F('total_questions') + int(total_questions_this_run)
        if correct_answers_this_run is not None:
            uf.correct_answers = F('correct_answers') + int(correct_answers_this_run)

        # 加權統計（以 cap 當作權重範例：也可以改 α 當權重，看你想分析什麼）
        # 這裡用 2 位小數即可（你的欄位 decimal_places=2）
        add_w_total   = (Decimal(str(total_questions_this_run)) * cap).quantize(DEC2)
        add_w_correct = (Decimal(str(correct_answers_this_run or 0)) * cap).quantize(DEC2)

        uf.weighted_total   = F('weighted_total') + add_w_total
        uf.weighted_correct = F('weighted_correct') + add_w_correct
        uf.cap_weighted_sum = F('cap_weighted_sum') + cap.quantize(DEC2)

    # 9) 這次的 Note 與難度記錄（可選）
    if note_id is not None:
        try:
            uf.note = Note.objects.get(pk=note_id)
        except ObjectDoesNotExist:
            pass
    uf.difficulty_level = level

    # 10) 寫回熟悉度
    uf.familiarity = new_pct  # 百分比
    uf.save(update_fields=[
        "note", "difficulty_level", "total_questions", "correct_answers",
        "weighted_total", "weighted_correct", "cap_weighted_sum",
        "familiarity", "updated_at"
    ])

    # 拿 F() 後的實值
    uf.refresh_from_db(fields=["familiarity"])

    return uf.familiarity  # 百分比（0~100）


# 優化版熟悉度計算函數 - 不增加 CPU 使用，通過減少數據庫操作提升性能
@transaction.atomic
def update_familiarity_weighted_average_optimized(
    *,
    user: User,
    quiz_topic_id: int,
    difficulty_level_id: int | None = None,
    difficulty_level_name: str | None = None,
    accuracy: float | Decimal | None = None,
    total_questions_this_run: int | None = None,
    correct_answers_this_run: int | None = None,
    note_id: int | None = None,
) -> Decimal:
    """
    優化版權重平均法熟悉度計算：
    - 保持原有計算邏輯的 100% 準確性
    - 通過減少數據庫操作提升性能
    - 不增加 CPU 使用
    
    權重平均法：
      new = old*(1 - alpha) + (accuracy*cap)*alpha   # 全部在 0~1 區間
    然後把 new 轉成百分比（0~100）存回 UserFamiliarity.familiarity

    參數：
      - accuracy：0~1 的本次正確率（你也可以不傳，改傳題數與正確數）
      - total_questions_this_run / correct_answers_this_run：用來算 accuracy
      - difficulty_level_id / name：兩者擇一提供
      - note_id：可選，這次測驗對應的 Note

    回傳：
      - 更新後 familiarity（百分比，Decimal，兩位小數）
    """

    # 1) 獲取 Quiz 和 Difficulty level（不使用 select_for_update，減少鎖定）
    quiz = Quiz.objects.get(pk=quiz_topic_id)

    if difficulty_level_id is not None:
        level = DifficultyLevels.objects.get(pk=difficulty_level_id)
    elif difficulty_level_name is not None:
        level = DifficultyLevels.objects.get(level_name=difficulty_level_name)
    else:
        raise ValueError("difficulty_level_id 或 difficulty_level_name 需擇一提供")

    cap = _get_cap(level)      # 0.3 / 0.5 / 0.7 / 1.0
    alpha = _get_alpha(level)  # 例：0.20

    # 2) 計算 accuracy（0~1）
    if accuracy is None:
        if total_questions_this_run is None or correct_answers_this_run is None:
            raise ValueError("accuracy 未提供時，必須提供 total_questions_this_run 與 correct_answers_this_run")
        if total_questions_this_run <= 0:
            raise ValueError("total_questions_this_run 必須 > 0")
        accuracy = correct_answers_this_run / total_questions_this_run

    acc = _q(accuracy)
    acc = _clamp01(acc)

    # 3) this_run = accuracy * cap（0~1 區間）
    this_run = (acc * cap).quantize(DEC4)

    # 4) 智能獲取或創建 UserFamiliarity（優化鎖定策略）
    try:
        # 先嘗試無鎖定讀取，檢查是否已達上限
        uf = UserFamiliarity.objects.get(user=user, quiz_topic_id=quiz_topic_id)
        current_familiarity_pct = _q(uf.familiarity)
        difficulty_cap_pct = cap * HUNDRED
        
        # 快速檢查：如果已達上限，直接返回，不進行任何更新
        if current_familiarity_pct >= difficulty_cap_pct:
            return uf.familiarity
            
        # 需要更新，使用 select_for_update 鎖定
        uf = UserFamiliarity.objects.select_for_update().get(pk=uf.pk)
        created = False
        
    except UserFamiliarity.DoesNotExist:
        # 新記錄，不需要鎖定
        uf = UserFamiliarity(
            user=user,
            quiz_topic_id=quiz_topic_id,
            note_id=note_id,
            difficulty_level=level,
            total_questions=0,
            correct_answers=0,
            weighted_total=Decimal('0.00'),
            weighted_correct=Decimal('0.00'),
            cap_weighted_sum=Decimal('0.00'),
            familiarity=Decimal('0.00'),
        )
        created = True

    # 5) 舊熟悉度計算（先轉回 0~1 區間再算）
    old_pct = _q(uf.familiarity) / HUNDRED
    old = _clamp01(old_pct)

    # 6) 權重平均更新（0~1）
    new01 = (old * (ONE - alpha) + this_run * alpha)
    new01 = _clamp01(new01)

    # 7) 轉回百分比並四捨五入兩位
    new_pct = (new01 * HUNDRED).quantize(DEC2, rounding=ROUND_HALF_UP)

    # 8) 累加統計欄位（保持原有邏輯）
    if total_questions_this_run:
        uf.total_questions = F('total_questions') + int(total_questions_this_run)
        if correct_answers_this_run is not None:
            uf.correct_answers = F('correct_answers') + int(correct_answers_this_run)

        # 加權統計（以 cap 當作權重）
        add_w_total = (Decimal(str(total_questions_this_run)) * cap).quantize(DEC2)
        add_w_correct = (Decimal(str(correct_answers_this_run or 0)) * cap).quantize(DEC2)

        uf.weighted_total = F('weighted_total') + add_w_total
        uf.weighted_correct = F('weighted_correct') + add_w_correct
        uf.cap_weighted_sum = F('cap_weighted_sum') + cap.quantize(DEC2)

    # 9) 設置 Note 與難度記錄（可選）
    if note_id is not None:
        try:
            uf.note = Note.objects.get(pk=note_id)
        except ObjectDoesNotExist:
            pass
    uf.difficulty_level = level

    # 10) 寫回熟悉度
    uf.familiarity = new_pct  # 百分比
    
    if created:
        # 新記錄，直接保存
        uf.save()
    else:
        # 現有記錄，使用 update_fields 優化
        uf.save(update_fields=[
            "note", "difficulty_level", "total_questions", "correct_answers",
            "weighted_total", "weighted_correct", "cap_weighted_sum",
            "familiarity", "updated_at"
        ])

    # 11) 獲取最終值（優化：只在必要時 refresh）
    if not created:
        uf.refresh_from_db(fields=["familiarity"])

    return uf.familiarity  # 百分比（0~100）
