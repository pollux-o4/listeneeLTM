const rules = new Intl.PluralRules('en')
export const counted = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${rules.select(count) === 'one' ? singular : plural}`
