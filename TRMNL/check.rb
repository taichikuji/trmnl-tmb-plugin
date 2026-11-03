# Run with the same Liquid engine and filters as trmnlp:
# docker run --rm --network none --entrypoint ruby -v "$PWD:/plugin:ro" -w /plugin trmnl/trmnlp:latest TRMNL/check.rb
require 'json'
require 'trmnl/liquid'

NOW = Time.utc(2026, 11, 3, 9, 3).to_i
Time.define_singleton_method(:now) { Time.at(NOW) }
ROOT = File.expand_path('src', __dir__)
LAYOUTS = { 'full' => 11, 'half_horizontal' => 4, 'half_vertical' => 7, 'quadrant' => 2 }.freeze
LINES = %w[L1 L2 L3 L4 L5 L9N L9S L10N L10S L11 FM].freeze

def alert(line = 'L1', code: 'PP8', type: 'INFRASTRUCTURE', status: 'WARNING', windows: [{ 'begin_date' => (NOW - 60) * 1000, 'end_date' => (NOW + 60) * 1000 }])
  { 'tstamp' => NOW * 1000, 'effect' => { 'code' => code, 'type' => type, 'status' => status },
    'entities' => [{ 'line_name' => line }], 'disruption_dates' => windows }
end

def render(alerts, layout: 'full', language: 'English', name: 'TMB Alerts')
  data = alerts.is_a?(Array) ? { 'alerts' => alerts } : alerts
  source = File.read("#{ROOT}/shared.liquid") + File.read("#{ROOT}/#{layout}.liquid")
  html = Liquid::Template.parse(source, environment: TRMNL::Liquid.new, error_mode: :strict).render!(
    { 'data' => data, 'trmnl' => { 'plugin_settings' => { 'instance_name' => name, 'custom_fields_values' => { 'userLanguage' => language } } } },
    strict_filters: true
  )
  raise 'Liquid rendering error' if html.include?('Liquid error:')
  html
end

def text(html)
  html.gsub(/<[^>]*>/, ' ').gsub(/\s+/, ' ').strip
end

def card(html, line)
  html.split('data-line-id="').find { |part| part.start_with?("#{line}\"") }.to_s
end

def assert(condition, message)
  raise message unless condition
  $checks += 1
end

$checks = 0
partial = alert('L2', code: 'PP1', type: 'TRAFFIC')
lift = alert('L2')
lift['tstamp'] += 1000
partial['entities'] *= 3 # Multiple stations on one line must count as one notice.
LAYOUTS.each_key do |layout|
  { 'English' => ['Partial service', 'Disruption'], 'Spanish' => ['Servicio parcial', 'Alteración'], 'Catalan' => ['Servei parcial', 'Alteració'] }.each do |language, labels|
    html = render([lift, partial, alert], layout: layout, language: language)
    l2 = text(card(html, 'L2'))
    assert(labels.all? { |label| l2.include?(label) }, "#{layout}/#{language}: circulation and station indicators")
    assert(l2.match?(/2 (?:notices|avisos)/), "#{layout}/#{language}: count notices, not entities")
    assert(html.scan(/data-line-id="([^"]+)"/).flatten == %w[L2 L1], "#{layout}/#{language}: circulation first, unique lines")
    assert(!l2.include?('WARNING'), "#{layout}/#{language}: no raw severity label")
  end
end

future = alert('L2', windows: [{ 'begin_date' => (NOW + 3600) * 1000, 'end_date' => nil }])
expired = alert('L3', windows: [{ 'begin_date' => NOW - 600, 'end_date' => NOW - 1 }])
html = render([future, expired, alert])
assert(html.scan(/data-line-id="([^"]+)"/).flatten == ['L1'], 'Exclude future and expired disruptions')
assert(text(html).include?('Upcoming: 1'), 'Count upcoming alerts separately')
assert(text(card(html, 'L1')).include?('Normal service'), 'Station-only notice leaves circulation normal')
future['publications'] = [{ 'begin_date' => (NOW - 86400) * 1000, 'end_date' => (NOW + 86400) * 1000 }]
assert(!render([future]).include?('data-line-id='), 'Publication window does not make a future disruption current')
assert(text(render([future])).include?('No current service notices'), 'Only upcoming alerts has a current empty state')
assert(render([future]).include?('class="qr-code"'), 'Keep the detail link when only upcoming notices exist')

multi = alert('L4', windows: expired['disruption_dates'] + [{ 'begin_date' => NOW.to_s, 'end_date' => NOW.to_s }] + future['disruption_dates'])
assert(render([multi]).include?('data-line-id="L4"'), 'Any current window is enough, including the end boundary')
assert(!text(render([multi])).include?('Upcoming:'), 'Do not count an active notice again as upcoming')
assert(render([alert(windows: [{ 'begin_date' => NOW - 60, 'end_date' => nil }])]).include?('data-line-id="L1"'), 'Support open-ended current windows')

[nil, [], [{ 'begin_date' => nil, 'end_date' => nil }], [{ 'begin_date' => 'invalid', 'end_date' => 'invalid' }], [{ 'begin_date' => NOW - 60, 'end_date' => 'invalid' }], [{ 'begin_date' => 'invalid', 'end_date' => NOW + 60 }], [{ 'begin_date' => NOW + 60, 'end_date' => NOW - 60 }]].each do |windows|
  html = render([alert(windows: windows)])
  assert(text(html).include?('Dates unavailable'), "Retain undated or invalid windows: #{windows.inspect}")
  assert(!text(html).include?('Normal service'), 'Undated notices must not imply normal service')
  assert(!text(html).include?('CURRENT'), 'Do not label undated notices current')
end
html = render([partial, alert('L2', windows: [])])
assert(text(card(html, 'L2')).include?('Partial service'), 'Undated station notice must not mask known circulation restrictions')
{ 'English' => 'Undated', 'Spanish' => 'Sin fecha', 'Catalan' => 'Sense data' }.each do |language, warning|
  html = render([partial, alert('L2', windows: [])], language: language)
  assert(text(card(html, 'L2')).include?(warning), "#{language}: retain the date warning alongside circulation status")
end

stopped = alert('L3', code: 'NP1', type: 'TRAFFIC', status: 'CRITICAL')
html = render([partial, stopped])
assert(html.scan(/data-line-id="([^"]+)"/).flatten.first == 'L3', 'Critical circulation first')
assert(text(card(html, 'L3')).include?('Line stopped'), 'Support critical traffic effects from the effect object')
assert(card(html, 'L3').include?('tmb-status-dot bg--red'), 'Stopped service has a red indicator')
assert(text(card(render([partial, alert('L2', code: 'PP5', type: 'TRAFFIC')]), 'L2')).include?('Service stopped'), 'Stronger traffic effect wins over newer partial service')
html = render([alert(type: 'NO_DATA')])
assert(text(html).include?('Info not available') && !text(html).include?('Normal service'), 'Unknown service data must not imply normal service')
assert(!text(render([alert(code: 'PP99')])).include?('Normal service'), 'PP99 must not imply normal service')
assert(text(render([alert(code: 'PP99', type: 'TRAFFIC')])).include?('Info not available'), 'PP99 traffic reports unavailable information')
assert(text(render([alert(type: 'TRAFFIC', status: 'NO_DATA')])).include?('Info not available'), 'NO_DATA traffic reports unavailable information')
assert(text(render([alert(code: 'FUTURE_CODE', type: 'TRAFFIC')])).include?('Service disruption'), 'Unknown traffic codes remain visible')
assert(text(render([alert(type: 'UNKNOWN')])).include?('Info not available'), 'Unknown alert types remain visible')
assert(render([alert('ALL', type: 'NO_DATA')]).scan(/data-line-id="([^"]+)"/).flatten == LINES, 'Network-wide alerts apply to every line')

[{}, { 'alerts' => nil }, { 'alerts' => {} }, { 'alerts' => 'bad' }].each do |data|
  assert(text(render(data)).include?('Data unavailable'), 'Unavailable data must not look like an empty successful response')
end
assert(text(render([])).include?('No current service notices'), 'A valid empty feed is a successful empty state')
assert(text(render([{ 'entities' => [] }])).include?('Data unavailable'), 'Unassigned notices must not imply no incidents')
assert(text(render([nil, 'bad', 123])).include?('Data unavailable'), 'Malformed entries must not imply no incidents')
html = render([alert('L1|L2')])
assert(!html.include?('data-line-id='), 'Invalid line identifiers must not create phantom lines')
assert(text(html).include?('Data unavailable'), 'Invalid line identifiers must not imply normal service')
fm = alert(nil)
fm['entities'] = [{ 'line_code' => 99 }]
assert(render([fm]).include?('data-line-id="FM"'), 'Keep the funicular fallback for numeric line code 99')

LAYOUTS.each do |layout, limit|
  html = render(LINES.map { |line| alert(line) }, layout: layout)
  assert(html.scan(/data-line-id="([^"]+)"/).flatten.length == limit, "#{layout}: preserve capacity")
  assert(text(html).include?("+#{11 - limit} more"), "#{layout}: show remaining count") if limit < 11
  assert(html.scan('class="title_bar"').length == 1, "#{layout}: exactly one native title bar")
  assert(!html.include?('<script'), "#{layout}: keep layouts free of scripts")
end
(1..11).each do |count|
  html = render(LINES.first(count).map { |line| alert(line) })
  assert(html.scan(/data-line-id="([^"]+)"/).flatten == LINES.first(count), "#{count} lines: keep every affected line")
end
html = render(Array.new(20) { alert })
assert(html.scan(/data-line-id="([^"]+)"/).flatten == ['L1'], 'Many notices on one line must stay in one card')
assert(text(html).include?('20 notices'), 'Keep the full notice count on a single affected line')
assert(text(card(render([alert('L10S')]), 'L10S')).include?('ZAL | Riu Vell / Collblanc'), 'Preserve the pipe inside the L10S route')
html = render([alert('<script>')], name: '<img onerror=alert(1)>')
assert(html.include?('&lt;script&gt;') && html.include?('&lt;img onerror=alert(1)&gt;'), 'Escape feed values and the instance name')
assert(!html.include?('<script>') && !html.include?('<img onerror='), 'Do not emit untrusted HTML')
puts "#{ $checks } Liquid regression checks passed"
