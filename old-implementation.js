import {parseDate as _parseDate} from "@vaadin/date-picker/src/vaadin-date-picker-helper";

const datepicker = {};
datepicker.$connector = {};

class FlowDatePickerPart {
  constructor(initial) {
    this.initial = initial;
    this.index = 0;
    this.value = 0;
  }

  static compare(part1, part2) {
    if (part1.index < part2.index) {
      return -1;
    }
    if (part1.index > part2.index) {
      return 1;
    }
    return 0;
  }
}

/* init helper parts for reverse-engineering date-regex */
datepicker.$connector.dayPart = new FlowDatePickerPart('22');
datepicker.$connector.monthPart = new FlowDatePickerPart('11');
datepicker.$connector.yearPart = new FlowDatePickerPart('1987');
datepicker.$connector.parts = [
  datepicker.$connector.dayPart,
  datepicker.$connector.monthPart,
  datepicker.$connector.yearPart
];

const cleanString = function (string) {
  // Clear any non ascii characters from the date string,
  // mainly the LEFT-TO-RIGHT MARK.
  // This is a problem for many Microsoft browsers where `toLocaleDateString`
  // adds the LEFT-TO-RIGHT MARK see https://en.wikipedia.org/wiki/Left-to-right_mark
  return string.replace(/[^\x00-\x7F]/g, '');
};

export const createOldLocaleBasedFormatterAndParser = function (locale) {
  try {
    // Check whether the locale is supported or not
    new Date().toLocaleDateString(locale);
  } catch (e) {
    locale = 'en-US';
    console.warn('The locale is not supported, using default locale setting(en-US).');
  }

  /* create test-string where to extract parsing regex */
  let testDate = new Date(
    Date.UTC(
      datepicker.$connector.yearPart.initial,
      datepicker.$connector.monthPart.initial - 1,
      datepicker.$connector.dayPart.initial
    )
  );
  let testString = cleanString(testDate.toLocaleDateString(locale, { timeZone: 'UTC' }));
  datepicker.$connector.parts.forEach(function (part) {
    part.index = testString.indexOf(part.initial);
  });
  /* sort items to match correct places in regex groups */
  datepicker.$connector.parts.sort(FlowDatePickerPart.compare);
  /* create regex
   * regex will be the date, so that:
   * - day-part is '(\d{1,2})' (1 or 2 digits),
   * - month-part is '(\d{1,2})' (1 or 2 digits),
   * - year-part is '(\d{1,4})' (1 to 4 digits)
   *
   * and everything else is left as is.
   * For example, us date "10/20/2010" => "(\d{1,2})/(\d{1,2})/(\d{1,4})".
   *
   * The sorting part solves that which part is which (for example,
   * here the first part is month, second day and third year)
   *  */
  datepicker.$connector.regex = testString
    .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
    .replace(datepicker.$connector.dayPart.initial, '(\\d{1,2})')
    .replace(datepicker.$connector.monthPart.initial, '(\\d{1,2})')
    .replace(datepicker.$connector.yearPart.initial, '(\\d{1,4})');

  function formatDate(date) {
    let rawDate = _parseDate(`${date.year}-${date.month + 1}-${date.day}`);

    // Workaround for Safari DST offset issue when using Date.toLocaleDateString().
    // This is needed to keep the correct date in formatted result even if Safari
    // makes an error of an hour or more in the result with some past dates.
    // See https://github.com/vaadin/vaadin-date-picker-flow/issues/126#issuecomment-508169514
    rawDate.setHours(12);

    return cleanString(rawDate.toLocaleDateString(locale));
  }

  function parseDate(dateString) {
    dateString = cleanString(dateString);

    if (dateString.length == 0) {
      return;
    }

    let match = dateString.match(datepicker.$connector.regex);
    if (match && match.length == 4) {
      for (let i = 1; i < 4; i++) {
        datepicker.$connector.parts[i - 1].value = parseInt(match[i]);
      }
      return {
        day: datepicker.$connector.dayPart.value,
        month: datepicker.$connector.monthPart.value - 1,
        year: datepicker.$connector.yearPart.value
      };
    } else {
      return false;
    }
  }

  return {
    formatDate: formatDate,
    parseDate: parseDate
  };
};
