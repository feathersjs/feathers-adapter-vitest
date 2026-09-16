export type RecommendedOperator = '$not' | '$regex' | '$between' | '$notBetween'

export type Test = (
  name: string,
  runner: any,
  options?: { recommended?: RecommendedOperator },
) => void
