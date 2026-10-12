import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { oneOf, usePreference } from '../infra/preferences';
import { DateFormatContext } from '../shared/dateFormat';
import { DATE_FORMAT_IDS, DEFAULT_DATE_FORMAT } from '../utils/dateUtils';
import type { DateFormat } from '../utils/dateUtils';

interface DateFormatSetting {
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
}

const DateFormatSettingContext = createContext<DateFormatSetting | null>(null);

/** Gives every screen the format of the dates this browser chose, and the settings a way to change it. */
export function DateFormatProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormat] = usePreference(
    'date-format',
    oneOf(DATE_FORMAT_IDS),
    DEFAULT_DATE_FORMAT,
  );
  return (
    <DateFormatSettingContext.Provider value={{ dateFormat, setDateFormat }}>
      <DateFormatContext.Provider value={dateFormat}>{children}</DateFormatContext.Provider>
    </DateFormatSettingContext.Provider>
  );
}

/** The date format preference, to show and change it in the settings. */
export function useDateFormatSetting(): DateFormatSetting {
  const setting = useContext(DateFormatSettingContext);
  if (setting === null)
    throw new Error('useDateFormatSetting needs a DateFormatProvider above it.');
  return setting;
}
