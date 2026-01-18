export { NDIS_PRACTICE_STANDARDS } from './ndis-practice-standards'
export { WHS_STANDARDS } from './whs-standards'
export { AGED_CARE_STANDARDS } from './aged-care-standards'
export { HVNL_STANDARDS } from './hvnl-standards'

export const ALL_LEGISLATION = [
  require('./ndis-practice-standards').NDIS_PRACTICE_STANDARDS,
  require('./whs-standards').WHS_STANDARDS,
  require('./aged-care-standards').AGED_CARE_STANDARDS,
  require('./hvnl-standards').HVNL_STANDARDS,
]
