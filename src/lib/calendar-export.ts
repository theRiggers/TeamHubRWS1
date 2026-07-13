import { TeamEvent } from './store';

/**
 * Generiert einen iCalendar (ICS) String aus einer Liste von Team-Events.
 */
export function generateIcsString(events: TeamEvent[]): string {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Headquarter RWS2//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(event => {
    const startDate = new Date(event.date);
    // Standard-Dauer: 90 Minuten für Training/Spiele, 180 Minuten für Events
    const duration = event.type === 'social' ? 180 : 90;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const typeLabel = event.type === 'training' ? 'Training' : event.type === 'match' ? 'Spiel' : 'Event';

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${event.id}@headquarter-rws2`);
    icsLines.push(`DTSTAMP:${formatDate(new Date())}`);
    icsLines.push(`DTSTART:${formatDate(startDate)}`);
    icsLines.push(`DTEND:${formatDate(endDate)}`);
    icsLines.push(`SUMMARY:${event.title}`);
    icsLines.push(`DESCRIPTION:Typ: ${typeLabel}`);
    if (event.location) {
      icsLines.push(`LOCATION:${event.location.replace(/,/g, '\\,')}`);
    }
    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

/**
 * Startet den Download einer ICS-Datei im Browser.
 */
export function downloadIcsFile(events: TeamEvent[], filename: string = 'team-termine.ics') {
  if (events.length === 0) return;
  
  const icsString = generateIcsString(events);
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
