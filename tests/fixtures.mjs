// Synthetic examples; never represent live TMB service status.
export function alert({ id = 1, status = 'WARNING', lines = ['L1'], headline = 'Lift unavailable at Fondo', text = 'Use the alternative accessible entrance. Allow extra time for your journey.', begin = '2026-09-14', end = '2026-09-18', code = 'PP_TEST' } = {}) {
  return {
    id, tstamp: id,
    categories: { effect_code: code, effect_status: status, cause_code: 'MAINTENANCE' },
    entities: lines.map(line_name => ({ line_name })),
    disruption_dates: [{ begin_date: begin ? Date.parse(begin) : null, end_date: end ? Date.parse(end) : null }],
    publications: [{
      headerEn: headline, textEn: text,
      headerEs: 'Ascensor fuera de servicio en Fondo', textEs: 'Utiliza el acceso accesible alternativo. Prevé más tiempo para tu viaje.',
      headerCa: 'Ascensor fora de servei a Fondo', textCa: 'Fes servir l’accés accessible alternatiu. Preveu més temps per al trajecte.'
    }]
  };
}
export const fixtures = {
  website: { alerts: Array.from({ length: 14 }, (_, i) => alert({
    id: i + 20,
    lines: [['L1','L1','L1','L2','L2','L3','L3','L3','L4','L4','L5','L5','L9N','L9N'][i]],
    headline: `Planned accessibility notice ${i + 1}`,
    status: i === 0 ? 'SEVERE' : 'WARNING'
  })) },
  normal: { alerts: [
    alert({ id: 5 }),
    alert({ id: 2, status: 'SEVERE', lines: ['L4', 'L5'], headline: 'Interchange closed at Verdaguer', text: 'Change between L4 and L5 at street level. Follow the signs to the alternative station entrance.', begin: '2026-09-10', end: '2026-10-13' }),
    alert({ id: 4, lines: ['L3'], headline: 'Escalator maintenance at Trinitat Nova' }),
    alert({ id: 3, lines: ['FM'], headline: 'Planned works on the Montjuïc funicular', end: null })
  ] },
  crowded: { alerts: Array.from({ length: 18 }, (_, i) => alert({ id: i + 1, lines: [['L1','L2','L3','L4','L5','L9N','L9S','L10N','L10S','L11','FM'][i % 11]], headline: `Station accessibility notice ${i + 1}: alternative entrance during maintenance works`, status: i === 0 ? 'SEVERE' : 'WARNING' })) },
  empty: { alerts: [] },
  missing: {},
  long: { alerts: [alert({ headline: 'Long station name and an extended service notice describing an alternative interchange between several metro platforms', text: 'Follow the alternative route through the station. '.repeat(20), lines: ['L9N','L9S','L10N','L10S'] })] }
};
