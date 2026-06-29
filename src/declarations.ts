export type RecommendedOperator = '$not' | '$regex'

export type Test = (
  name: string,
  runner: any,
  options?: { recommended?: RecommendedOperator },
) => void
