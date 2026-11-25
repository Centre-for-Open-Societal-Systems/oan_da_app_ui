import { WIZARD_STEPS } from "./registrySpec";

// One step per part of the POST /farmers body, then a final review.
export const REGISTRATION_STEPS = WIZARD_STEPS.map(({ key, label }) => ({ key, label }));

export const TOTAL_STEPS = REGISTRATION_STEPS.length;
