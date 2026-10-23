"""Generate original, deterministic fictional review fixtures. No web content is used."""
import json
from pathlib import Path

root = Path('data/fixtures/visit2value/hotel')
root.mkdir(parents=True, exist_ok=True)
sources = ['Simulated Stay Portal', 'Simulated Map Reviews', 'Simulated Guest Form']
items = []
analysis = []

def point(quote, category, aspect, kind, theme, severity=None):
    return {'category': category, 'aspect': aspect, 'kind': kind,
            'sentiment': 'positive' if kind == 'specific_praise' else 'neutral' if kind == 'suggestion' else 'negative',
            'evidenceQuote': quote, 'summary': quote.rstrip('.!'),
            'normalizedDescription': f'{aspect.replace("_", " ")} feedback',
            'expectedThemeId': theme}

def add(index, business, branch, segments, rating, source=None, demo=False):
    prefix = 'hotel-demo' if demo else 'hotel' if business == 'harbour-house' else 'salon'
    review = {'id': f'{prefix}-{index:03d}', 'businessId': business, 'branchId': branch,
              'source': source or sources[index % len(sources)], 'sourceReviewId': f'{prefix}-source-{index:03d}',
              'rating': rating, 'reviewedAt': f'2026-{1 + index % 10:02d}-{1 + index % 27:02d}T{8 + index % 12:02d}:15:00+08:00',
              'text': ' '.join(segment[0] for segment in segments), 'isSynthetic': True}
    items.append(review)
    analysis.append({'reviewId': review['id'], 'useful': bool(segments and any(segment[1] for segment in segments)),
                     'observations': [segment[1] for segment in segments if segment[1]]})

ac = [
    'The air conditioning in room {room} did not cool the room overnight.',
    'Room {room} stayed warm even with the AC set low.',
    'The aircon in room {room} kept blowing warm air.',
    'Penghawa dingin bilik {room} tidak sejuk sepanjang malam.',
    'Our room {room} was stuffy because the cooling was weak.',
    'AC bilik {room} tak sejuk and we barely slept.',
]
front = ['The front desk team were welcoming.', 'Check-in staff explained everything clearly.', 'Staf kaunter sangat mesra.']
for i in range(1, 25):
    quote = ac[(i-1) % len(ac)].format(room=201 + i)
    segments = [(quote, point(quote, 'room_comfort', 'air_conditioning', 'operational_complaint', 'hotel-central-ac'))]
    if i % 4 == 0:
        praise = front[i % len(front)]
        segments.append((praise, point(praise, 'service', 'front_desk', 'specific_praise', 'hotel-central-staff-praise')))
    if i % 7 == 0:
        bug = f'We noticed a small insect near the bathroom sink in room {201+i}.'
        segments.append((bug, point(bug, 'cleanliness', 'insect_sighting', 'operational_complaint', 'hotel-central-insects')))
    add(i, 'harbour-house', 'hotel-central', segments, 2 if i % 3 else 3)

insects = ['I saw a small insect by the bathroom drain in room {room}.',
           'Ada serangga kecil di bilik air, room {room}.',
           'An insect was crawling near the sink in room {room}.']
for i in range(25, 35):
    quote = insects[i % len(insects)].format(room=301+i)
    add(i, 'harbour-house', 'hotel-central', [(quote, point(quote, 'cleanliness', 'insect_sighting', 'operational_complaint', 'hotel-central-insects'))], 2)

patterns = [
    ('check_in', 'operational_complaint', 'Check-in took almost forty minutes after the stated arrival time.', 'hotel-central-checkin'),
    ('cleanliness', 'operational_complaint', 'The bathroom mirror still had marks when we entered.', 'hotel-central-cleanliness'),
    ('breakfast', 'suggestion', 'Please add another vegetarian breakfast option.', 'hotel-central-breakfast'),
    ('noise', 'operational_complaint', 'Traffic noise came through the window late at night.', 'hotel-central-noise'),
    ('staff_helpfulness', 'specific_praise', 'The concierge helped us find an accessible taxi.', 'hotel-central-staff-praise'),
    ('pool', 'suggestion', 'Longer pool hours would help guests arriving late.', 'hotel-central-pool'),
    ('price', 'operational_complaint', 'The breakfast surcharge felt high for the choices offered.', 'hotel-central-pricing'),
    ('accessibility', 'operational_complaint', 'The lift button near our floor was hard to reach from a wheelchair.', 'hotel-central-accessibility'),
    ('wifi', 'operational_complaint', 'The Wi-Fi disconnected several times during a video call.', 'hotel-central-wifi'),
    ('beds', 'specific_praise', 'The mattress was firm and comfortable.', 'hotel-central-beds'),
]
alt_patterns = [
    ('breakfast', 'specific_praise', 'The breakfast spread had fresh fruit and warm bread.', 'hotel-garden-breakfast-praise'),
    ('noise', 'operational_complaint', 'Music from the street carried into our room after midnight.', 'hotel-garden-noise'),
    ('cleanliness', 'specific_praise', 'The room and bathroom were spotless on arrival.', 'hotel-garden-clean-praise'),
    ('check_in', 'operational_complaint', 'The check-in queue moved slowly on Saturday afternoon.', 'hotel-garden-checkin'),
    ('amenity', 'suggestion', 'A water refill station on each floor would be useful.', 'hotel-garden-water'),
    ('air_conditioning', 'operational_complaint', 'The AC in room 508 made a loud clicking sound.', 'hotel-garden-ac-noise'),
]

# Keep each complaint recognisable as the same issue without copying a review
# verbatim across many different guests. The room/booking detail is stable for
# each fixture so the generated review and its evidence quote stay aligned.
def varied_quote(theme, original, index):
    room = 300 + index
    variants = {
        'hotel-central-accessibility': [
            f'From my wheelchair, I struggled to reach the lift button near room {room}.',
            f'The lift call button outside room {room} sat too high for me to press from my wheelchair.',
            f'I needed help pressing the lift button by room {room} because it was out of reach from my wheelchair.',
        ],
        'hotel-central-checkin': [
            f'Checking in for room {room} took much longer than expected.',
            f'We waited at reception before we could get the key for room {room}.',
            f'The queue for our room {room} check-in barely moved.',
        ],
        'hotel-garden-checkin': [
            f'Our Saturday check-in for room {room} moved very slowly.',
            f'We spent too long in the arrival queue before getting room {room}.',
            f'The reception line held us up when we arrived for room {room}.',
        ],
        'hotel-central-wifi': [
            f'The Wi-Fi in room {room} dropped during my video call.',
            f'I kept losing the internet connection while working from room {room}.',
            f'A video call from room {room} froze repeatedly because the Wi-Fi cut out.',
        ],
        'hotel-central-noise': [
            f'Road noise was loud enough to wake us in room {room}.',
            f'We could hear traffic through the window of room {room} late at night.',
            f'The street sounds carried into room {room} while we were trying to sleep.',
        ],
        'hotel-garden-noise': [
            f'Street music reached room {room} after midnight.',
            f'We could still hear music from outside in room {room} late at night.',
            f'The music outside kept us awake in room {room}.',
        ],
        'hotel-central-cleanliness': [
            f'The bathroom mirror in room {room} had marks on it when we arrived.',
            f'We found streaks on the mirror in room {room} at check-in.',
            f'Room {room} looked tidy, but the bathroom mirror had not been wiped properly.',
        ],
        'hotel-garden-ac-noise': [
            f'The air conditioner in room {room} clicked loudly through the night.',
            f'A repeated clicking sound came from the AC in room {room}.',
            f'The AC unit in room {room} made a noise that disturbed our sleep.',
        ],
    }
    if theme in variants:
        return variants[theme][index % 3]
    # These shared amenities have no room number in the complaint. Rotate
    # natural lead-ins and details so the evidence is similar, not identical.
    occurrence = index // (6 if theme.startswith('hotel-garden-') else 10)
    lead = ['During our stay, ', 'For our visit, ', 'This time, ', 'I noticed that ', 'We felt that '][occurrence % 5]
    return lead + original[0].lower() + original[1:]

for i in range(35, 221):
    branch = 'hotel-central' if i % 3 else 'hotel-garden'
    if i % 13 == 0:
        quote = ['Great stay!', 'Terrible hotel.', 'Everything was okay.'][i % 3]
        add(i, 'harbour-house', branch, [(quote, None)], 5 if i % 2 else 2)
        continue
    spec = (patterns if branch == 'hotel-central' else alt_patterns)[i % (10 if branch == 'hotel-central' else 6)]
    aspect, kind, quote, theme = spec
    quote = varied_quote(theme, quote, i)
    segments = [(quote, point(quote, 'guest_experience', aspect, kind, theme))]
    if i % 9 == 0:
        extra = 'The reception staff greeted us warmly.'
        segments.append((extra, point(extra, 'service', 'front_desk', 'specific_praise', 'hotel-central-staff-praise' if branch == 'hotel-central' else 'hotel-garden-staff-praise')))
    if i % 11 == 0:
        segments.append(('Overall it was nice.', None))
    add(i, 'harbour-house', branch, segments, 2 if kind == 'operational_complaint' else 4 if kind == 'suggestion' else 5)

# Separate Garden coverage: the historical index distribution above emphasizes
# check-in and breakfast, so these rows keep the other property topics visible.
for i in range(221, 245):
    aspect, kind, quote, theme = alt_patterns[(i - 221) % len(alt_patterns)]
    quote = varied_quote(theme, quote, i)
    segments = [(quote, point(quote, 'guest_experience', aspect, kind, theme))]
    segments.append((f'Our stay was on floor {1 + (i % 8)}.', None))
    add(i, 'harbour-house', 'hotel-garden', segments, 2 if kind == 'operational_complaint' else 4 if kind == 'suggestion' else 5)

hotel_reviews, hotel_analysis = items[:], analysis[:]
items.clear(); analysis.clear()
salon_patterns = [
    ('The stylist explained the cut before starting.', 'stylist_communication', 'specific_praise', 'salon-stylist-praise'),
    ('My appointment started twenty minutes late.', 'appointment_delay', 'operational_complaint', 'salon-delay'),
    ('Please offer a fragrance-free shampoo.', 'fragrance_free', 'suggestion', 'salon-fragrance'),
    ('The wash station was tidy and clean.', 'cleanliness', 'specific_praise', 'salon-clean'),
]
for i in range(1, 19):
    if i % 9 == 0:
        add(i, 'luma-salon', 'salon-main', [('Nice place!', None)], 5, sources[i % 3])
    else:
        quote, aspect, kind, theme = salon_patterns[i % len(salon_patterns)]
        add(i, 'luma-salon', 'salon-main', [(quote, point(quote, 'salon_service', aspect, kind, theme))], 2 if kind == 'operational_complaint' else 5, sources[i % 3])

new_quote = 'The AC in room 226 blew warm air all night.'
new_bug = 'We also saw a small insect near the bathroom sink.'
new_praise = 'The front desk was patient and helpful.'
demo_review = {'id': 'hotel-demo-001', 'businessId': 'harbour-house', 'branchId': 'hotel-central',
               'source': 'Simulated Guest Form', 'sourceReviewId': 'hotel-demo-source-001', 'rating': 2,
               'reviewedAt': '2026-10-23T12:00:00+08:00',
               'text': ' '.join([new_quote, new_bug, new_praise]), 'isSynthetic': True}
demo_analysis = {'reviewId': demo_review['id'], 'useful': True,
                 'observations': [point(new_quote, 'room_comfort', 'air_conditioning', 'operational_complaint', 'hotel-central-ac'),
                                  point(new_bug, 'cleanliness', 'insect_sighting', 'operational_complaint', 'hotel-central-insects'),
                                  point(new_praise, 'service', 'front_desk', 'specific_praise', 'hotel-central-staff-praise')]}
for name, value in [('reviews.seed.json', hotel_reviews), ('reviews.analysis.json', hotel_analysis),
                    ('reviews.demo-new.json', [demo_review]), ('reviews.demo-analysis.json', [demo_analysis]),
                    ('salon.seed.json', items), ('salon.analysis.json', analysis)]:
    (root / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
print(f'Generated {len(hotel_reviews)} hotel and {len(items)} salon seed reviews')
