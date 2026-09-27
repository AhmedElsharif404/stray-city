-- Sample discovery data for local development.
-- Every row is visibly labeled through is_sample until replaced by curated or ETL data.

insert into public.places (
  id, name, category, lat, lng, address, borough, neighborhood, description,
  photos, local_tips, tags, cuisine, sidequest_objective, cost_verified,
  cost_info, hidden_gem_verified, inspection_grade, inspection_score,
  inspection_date, event_starts_at, event_ends_at, source, external_id,
  source_url, is_sample
) values
  (
    '10000000-0000-4000-8000-000000000001', 'Socrates Sculpture Park', 'hidden_gem',
    40.7685, -73.9361, '32-01 Vernon Blvd, Long Island City, NY', 'Queens', 'Astoria',
    'An open-air museum on the East River where monumental art, skyline views, and neighborhood picnics overlap.',
    array['https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=85'],
    array['Go near golden hour for the skyline.', 'Pair it with the Noguchi Museum next door.'],
    array['art', 'quiet', 'outdoors', 'sunset'], null, null, true, 'Free admission', true,
    null, null, null, null, null, 'admin', 'sample-socrates',
    'https://socratessculpturepark.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'Roosevelt Island Tram View', 'sidequest',
    40.7614, -73.9509, 'Roosevelt Island Tramway, New York, NY', 'Manhattan', 'Roosevelt Island',
    'A pocket-sized aerial adventure with surprising views over the East River.',
    array['https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1200&q=85'],
    array['Ride eastbound just before sunset.', 'A MetroCard swipe covers the ride.'],
    array['views', 'playful', 'sunset', 'transit'], null,
    'Spot three yellow taxis from above before the tram reaches the island.', true, '$2.90 each way', false,
    null, null, null, null, null, 'admin', 'sample-tram', 'https://rioc.ny.gov/302/Tram', true
  ),
  (
    '10000000-0000-4000-8000-000000000003', 'Arepa Lady', 'cheap_eat',
    40.7476, -73.8916, '77-17 37th Ave, Jackson Heights, NY', 'Queens', 'Jackson Heights',
    'A beloved Colombian stop for crisp corn arepas and late-night neighborhood energy.',
    array['https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=1200&q=85'],
    array['The arepa de queso is the classic order.', 'Bring a friend and split two fillings.'],
    array['food', 'late-night', 'lively', 'latin'], 'Colombian', null, true, 'Most plates $8–$16', false,
    'A', 9, '2026-04-18', null, null, 'admin', 'sample-arepa-lady', 'https://www.arepalady.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000004', 'Green-Wood Cemetery Vista', 'hidden_gem',
    40.6591, -73.9948, '500 25th St, Brooklyn, NY', 'Brooklyn', 'Greenwood Heights',
    'Historic paths, elaborate monuments, and one of Brooklyn''s quietest skyline overlooks.',
    array['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85'],
    array['Enter at the Gothic arch on Fifth Avenue.', 'Keep voices low—this is an active cemetery.'],
    array['history', 'quiet', 'walk', 'architecture'], null, null, true, 'Free admission', true,
    null, null, null, null, null, 'admin', 'sample-greenwood', 'https://www.green-wood.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000005', 'Elizabeth Street Garden', 'park',
    40.7221, -73.9947, 'Elizabeth St, New York, NY', 'Manhattan', 'Nolita',
    'A lush community garden filled with architectural fragments and a little city magic.',
    array['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85'],
    array['Hours vary; check before walking over.', 'Look closely at the stone lions.'],
    array['quiet', 'garden', 'romantic', 'daytime'], null, null, true, 'Free', true,
    null, null, null, null, null, 'admin', 'sample-elizabeth-garden', 'https://www.elizabethstreetgarden.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000006', 'The Panorama at Queens Museum', 'sidequest',
    40.7458, -73.8467, 'Flushing Meadows Corona Park, Queens, NY', 'Queens', 'Flushing Meadows',
    'A room-sized scale model of New York City built for the 1964 World''s Fair.',
    array['https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=85'],
    array['Find your own block, then trace a route to the museum.', 'Friday afternoons are usually calm.'],
    array['art', 'history', 'rainy-day', 'playful'], null,
    'Find all five boroughs, then locate the smallest island you can.', true, 'Suggested admission', false,
    null, null, null, null, null, 'admin', 'sample-panorama', 'https://queensmuseum.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000007', 'Abraco', 'cafe',
    40.7270, -73.9850, '81 E 7th St, New York, NY', 'Manhattan', 'East Village',
    'A tiny neighborhood coffee bar with an excellent olive-oil cake and a warm front patio.',
    array['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85'],
    array['Order at the window.', 'The olive-oil cake sells out.'],
    array['coffee', 'cozy', 'solo', 'morning'], 'Coffee & bakery', null, true, 'Coffee and pastry about $10', false,
    'A', 5, '2026-02-03', null, null, 'admin', 'sample-abraco', 'https://www.abraconyc.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000008', 'Bronx River Foodway', 'hidden_gem',
    40.8360, -73.8883, 'Concrete Plant Park, Bronx, NY', 'The Bronx', 'Longwood',
    'An edible landscape growing along the Bronx River inside a former concrete plant.',
    array['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=85'],
    array['Combine it with the Bronx River Greenway.', 'Volunteer days are the best way to learn.'],
    array['outdoors', 'community', 'garden', 'quiet'], null, null, true, 'Free', true,
    null, null, null, null, null, 'admin', 'sample-foodway', 'https://bronxriver.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000009', 'Queens Night Market', 'popup_event',
    40.7429, -73.8494, 'New York Hall of Science, Queens, NY', 'Queens', 'Flushing Meadows',
    'An open-air night market with food from dozens of countries and a famously affordable cap.',
    array['https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=85'],
    array['Arrive at opening to skip the longest lines.', 'Bring cash as a backup.'],
    array['food', 'lively', 'night', 'groups'], 'Global street food', null, true, 'Most food capped around $6–$8', false,
    null, null, null, now() + interval '30 hours', now() + interval '36 hours',
    'admin', 'sample-night-market', 'https://queensnightmarket.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000010', 'SriPraPhai', 'restaurant',
    40.7461, -73.8992, '64-13 39th Ave, Woodside, NY', 'Queens', 'Woodside',
    'Long-running Thai destination with a deep menu and a leafy back garden.',
    array['https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=85'],
    array['Ask about regional specials.', 'The garden is worth waiting for in warm weather.'],
    array['food', 'groups', 'spicy', 'garden'], 'Thai', null, true, 'Mains mostly $14–$24', false,
    'A', 8, '2026-05-22', null, null, 'admin', 'sample-sripraphai', 'https://sripraphai.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000011', 'Museum of the Moving Image', 'museum',
    40.7563, -73.9239, '36-01 35th Ave, Astoria, NY', 'Queens', 'Astoria',
    'Film, television, and digital-media history in a former studio complex.', array[]::text[], array['Try the playable arcade collection.'], array['film', 'rainy-day'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-moving-image', 'https://movingimage.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000012', 'Astoria Bookshop', 'bookstore',
    40.7638, -73.9236, '36-19 30th St, Astoria, NY', 'Queens', 'Astoria',
    'An independent neighborhood bookshop with readings and community shelves.', array[]::text[], array['Check the local-author shelf.'], array['books', 'quiet'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-astoria-bookshop', 'https://astoriabookshop.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000013', 'The Noguchi Museum', 'museum',
    40.7669, -73.9381, '9-01 33rd Rd, Long Island City, NY', 'Queens', 'Astoria',
    'Isamu Noguchi sculptures arranged through quiet galleries and a stone garden.', array[]::text[], array['Pair it with Socrates Sculpture Park.'], array['art', 'garden', 'quiet'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-noguchi', 'https://www.noguchi.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000014', 'Bohemian Hall & Beer Garden', 'bar',
    40.7729, -73.9156, '29-19 24th Ave, Astoria, NY', 'Queens', 'Astoria',
    'A century-old outdoor gathering place for Czech food, music, and long communal tables.', array[]::text[], array['The courtyard is best on a mild afternoon.'], array['outdoors', 'groups', 'music'], 'Czech', null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-bohemian-hall', 'https://bohemianhall.com/', true
  ),
  (
    '10000000-0000-4000-8000-000000000015', 'Welling Court Mural Project', 'public_art',
    40.7691, -73.9334, '11-98 Welling Ct, Astoria, NY', 'Queens', 'Astoria',
    'A changing outdoor collection of murals spread across residential blocks.', array[]::text[], array['Walk the surrounding blocks—the art extends beyond the court.'], array['art', 'walk', 'outdoors'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-welling-court', null, true
  ),
  (
    '10000000-0000-4000-8000-000000000016', 'The Little Red Lighthouse', 'landmark',
    40.8506, -73.9467, 'Fort Washington Park, New York, NY', 'Manhattan', 'Washington Heights',
    'A tiny lighthouse tucked directly beneath the George Washington Bridge.', array[]::text[], array['Approach along the Hudson River Greenway.'], array['history', 'waterfront', 'walk'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-little-red-lighthouse', null, true
  ),
  (
    '10000000-0000-4000-8000-000000000017', 'McGolrick Park', 'park',
    40.7244, -73.9433, 'Russell St & Nassau Ave, Brooklyn, NY', 'Brooklyn', 'Greenpoint',
    'A leafy neighborhood park centered on a historic pavilion.', array[]::text[], array['Visit during the weekend farmers market.'], array['park', 'quiet', 'market'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-mcgolrick', null, true
  ),
  (
    '10000000-0000-4000-8000-000000000018', 'Books Are Magic', 'bookstore',
    40.6842, -73.9955, '225 Smith St, Brooklyn, NY', 'Brooklyn', 'Cobble Hill',
    'A bright independent bookstore with frequent author events.', array[]::text[], array['Look for signed editions near the register.'], array['books', 'events'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-books-are-magic', 'https://booksaremagic.net/', true
  ),
  (
    '10000000-0000-4000-8000-000000000019', 'The Bronx Museum', 'museum',
    40.8312, -73.9197, '1040 Grand Concourse, Bronx, NY', 'The Bronx', 'Concourse',
    'Contemporary art rooted in the Bronx and its global communities.', array[]::text[], array['Admission is free.'], array['art', 'rainy-day'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-bronx-museum', 'https://bronxmuseum.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000020', 'Wave Hill', 'garden',
    40.8978, -73.9117, '649 W 249th St, Bronx, NY', 'The Bronx', 'Riverdale',
    'A public garden and cultural center overlooking the Hudson and Palisades.', array[]::text[], array['Go on a clear morning for the river view.'], array['garden', 'views', 'quiet'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-wave-hill', 'https://www.wavehill.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000021', 'Snug Harbor Botanical Garden', 'garden',
    40.6436, -74.1028, '1000 Richmond Ter, Staten Island, NY', 'Staten Island', 'Randall Manor',
    'Historic grounds, wetlands, and themed gardens surrounding a cultural campus.', array[]::text[], array['Leave time for the Chinese Scholar''s Garden.'], array['garden', 'history', 'walk'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-snug-harbor', 'https://snug-harbor.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000022', 'Nuyorican Poets Cafe', 'music_venue',
    40.7218, -73.9817, '236 E 3rd St, New York, NY', 'Manhattan', 'Lower East Side',
    'A landmark stage for poetry, music, theatre, and spoken-word performance.', array[]::text[], array['Check the calendar before visiting.'], array['poetry', 'music', 'night'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-nuyorican', 'https://www.nuyorican.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000023', 'Essex Market', 'market',
    40.7180, -73.9882, '88 Essex St, New York, NY', 'Manhattan', 'Lower East Side',
    'A public market bringing neighborhood food vendors under one roof.', array[]::text[], array['Browse first, then build a shared lunch.'], array['food', 'market', 'rainy-day'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-essex-market', 'https://www.essexmarket.nyc/', true
  ),
  (
    '10000000-0000-4000-8000-000000000024', 'Film Forum', 'cinema',
    40.7284, -74.0044, '209 W Houston St, New York, NY', 'Manhattan', 'Greenwich Village',
    'An independent cinema for repertory classics and new documentary films.', array[]::text[], array['Arrive early for popular restorations.'], array['film', 'rainy-day'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-film-forum', 'https://filmforum.org/', true
  ),
  (
    '10000000-0000-4000-8000-000000000025', 'Jamaica Bay Wildlife Refuge', 'attraction',
    40.6164, -73.8240, '175-10 Cross Bay Blvd, Queens, NY', 'Queens', 'Broad Channel',
    'Salt-marsh trails and birding overlooks inside Gateway National Recreation Area.', array[]::text[], array['Bring binoculars and check the tide.'], array['wildlife', 'outdoors', 'quiet'], null, null,
    false, null, false, null, null, null, null, null, 'admin', 'sample-jamaica-bay', 'https://www.nps.gov/gate/', true
  )
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  lat = excluded.lat,
  lng = excluded.lng,
  address = excluded.address,
  borough = excluded.borough,
  neighborhood = excluded.neighborhood,
  description = excluded.description,
  photos = excluded.photos,
  local_tips = excluded.local_tips,
  tags = excluded.tags,
  cuisine = excluded.cuisine,
  sidequest_objective = excluded.sidequest_objective,
  cost_verified = excluded.cost_verified,
  cost_info = excluded.cost_info,
  hidden_gem_verified = excluded.hidden_gem_verified,
  inspection_grade = excluded.inspection_grade,
  inspection_score = excluded.inspection_score,
  inspection_date = excluded.inspection_date,
  event_starts_at = excluded.event_starts_at,
  event_ends_at = excluded.event_ends_at,
  source_url = excluded.source_url,
  is_sample = true,
  updated_at = now();
