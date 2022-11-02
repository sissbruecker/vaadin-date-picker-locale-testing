import dateFnsFormat from 'date-fns/format';
import dateFnsParse from 'date-fns/parse';
import dateFnsIsValid from 'date-fns/isValid';
import {parseDate as _parseDate} from "@vaadin/date-picker/src/vaadin-date-picker-helper";

const cleanString = function (string) {
  // Clear any non ascii characters from the date string,
  // mainly the LEFT-TO-RIGHT MARK.
  // This is a problem for many Microsoft browsers where `toLocaleDateString`
  // adds the LEFT-TO-RIGHT MARK see https://en.wikipedia.org/wiki/Left-to-right_mark
  return string.replace(/[^\x00-\x7F]/g, '');
};

const createLocaleBasedDateFormat = function(locale) {
  try {
    // Check whether the locale is supported or not
    new Date().toLocaleDateString(locale);
  } catch (e) {
    locale = 'en-US';
    console.warn('The locale is not supported, using default locale setting(en-US).');
  }

  // format test date and convert to date-fns pattern
  const testDate = new Date(Date.UTC(1234, 4, 6));
  let pattern = cleanString(testDate.toLocaleDateString(locale, { timeZone: 'UTC' }));
  // escape date-fns pattern letters
  pattern = pattern.replace(/([a-zA-Z]+)/g, "'$1'");

  if (/06/.test(pattern)) {
    pattern = pattern.replace('06', 'dd')
  } else {
    pattern = pattern.replace('6', 'd')
  }
  if (/05/.test(pattern)) {
    pattern = pattern.replace('05', 'MM')
  } else {
    pattern = pattern.replace('5', 'M')
  }
  pattern = pattern.replace('1234', 'y')

  return pattern;
};

const createFormatterAndParser = function (formats) {
  if (!formats || formats.length === 0) {
    throw new Error('Array of custom date formats is null or empty');
  }

  function formatDate(dateParts) {
    const format = formats[0];
    const date = _parseDate(`${dateParts.year}-${dateParts.month + 1}-${dateParts.day}`);

    return dateFnsFormat(date, format);
  }

  function parseDate(dateString) {
    for (let format of formats) {
      const date = dateFnsParse(cleanString(dateString), format, new Date());

      if (dateFnsIsValid(date)) {
        return {
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear()
        };
      }
    }
    return false;
  }

  return {
    formatDate: formatDate,
    parseDate: parseDate
  };
};

export const createNewLocaleBasedFormatterAndParser = function (locale) {
  const formats = [createLocaleBasedDateFormat(locale)];
  return createFormatterAndParser(formats);
}