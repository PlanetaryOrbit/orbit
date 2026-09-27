import type { FieldOutputTypes } from '~~/prisma/contract.d';

export type PublicModels = FieldOutputTypes['public'];

export type User = PublicModels['User'];
export type Instance = PublicModels['Instance'];
export type Session = PublicModels['Session'];
export type Credential = PublicModels['Credential'];
