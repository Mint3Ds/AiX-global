# Visit2Value synthetic review fixtures

Nusa Table is a fictional Malaysian casual restaurant. The main demo branch is Nusa Table Sunway (`sunway`); a smaller set represents Nusa Table Bangsar (`bangsar`). The source labels are fictional prototype labels and do not represent connected review services.

## Files and coverage

- `reviews.seed.json`: 80 reviews dated May–October 2026, with 69 Sunway and 11 Bangsar records.
- `reviews.demo-new.json`: five additional records for manual entry; none are in the seed. Enter **`demo-review-001` first** for the live workflow demonstration. It reports a rocking booth and separately praises the fried rice.
- `reviews.expected-analysis.json`: human-authored expected examples for classification, observation extraction, exact evidence, and candidate theme membership. These are test expectations, not model output.

The seed is arranged approximately as 15 low-information opinions (including eight vague positive and seven vague negative reviews), 15 specific praise-only reviews, 15 focused complaints, 25 mixed reviews, and 10 suggestions or questions. It includes recurring Sunway seating stability concerns, cooler-than-expected soup dumplings, busy-period service delays, fried rice praise, and requests for more vegetarian options. Other one-off topics include noise, menu clarity, tea refills, accessibility, portions, and price. Reviews include English, Malay, and English–Malay mixed wording.

All records and source IDs are entirely synthetic and are clearly marked with `isSynthetic: true`. No record comes from a real diner, restaurant, review platform, or owner response. Keep observations scoped to their branch; the expected-analysis file includes a Bangsar dumpling example to test that separation.
