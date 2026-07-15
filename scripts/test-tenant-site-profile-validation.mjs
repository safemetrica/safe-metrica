import assert from "node:assert/strict";
import {
  isTenantSiteProfileComplete,
  normalizeProfileList,
  validateTenantSiteProfile,
} from "../src/lib/tenant-onboarding/tenantSiteProfileValidation.ts";

const validInput = {
  siteName: "본사 공장",
  industryProfile: "식품 제조업",
  majorProcesses: "입고, 세척",
  majorEquipment: "컨베이어, 포장기",
  workerCountBand: "50-99명",
  usesExternalWorkforce: "no",
  hasWorkerRepresentative: "no",
};

function validate(overrides = {}) {
  return validateTenantSiteProfile({ ...validInput, ...overrides });
}

function expectInvalid(name, overrides, field) {
  const result = validate(overrides);
  assert.equal(result.ok, false, `${name}: expected validation failure`);
  assert.ok(result.fieldErrors[field], `${name}: expected ${field} field error`);
}

expectInvalid("siteName whitespace", { siteName: "   " }, "siteName");
expectInvalid("industryProfile whitespace", { industryProfile: "   " }, "industryProfile");
expectInvalid("majorProcesses zero", { majorProcesses: " , ， \n " }, "majorProcesses");
expectInvalid("majorEquipment zero", { majorEquipment: " , ， \n " }, "majorEquipment");

const twentyItems = Array.from({ length: 20 }, (_, index) => `항목${index + 1}`).join(",");
assert.equal(validate({ majorProcesses: twentyItems }).ok, true, "20 items should pass");
expectInvalid("21 items", { majorProcesses: `${twentyItems},항목21` }, "majorProcesses");

const eightyChars = "가".repeat(80);
const eightyOneChars = "가".repeat(81);
assert.equal(validate({ majorProcesses: eightyChars }).ok, true, "80-char item should pass");
expectInvalid("81-char item", { majorProcesses: eightyOneChars }, "majorProcesses");

assert.deepEqual(normalizeProfileList("절단,용접,도장"), ["절단", "용접", "도장"], "comma parsing");
assert.deepEqual(normalizeProfileList("절단，용접，도장"), ["절단", "용접", "도장"], "Korean comma parsing");
assert.deepEqual(normalizeProfileList("절단\n용접\n도장"), ["절단", "용접", "도장"], "newline parsing");
assert.deepEqual(normalizeProfileList(" 절단, , 용접， \n도장 "), ["절단", "용접", "도장"], "blank item removal");
assert.deepEqual(normalizeProfileList("Pump,pump,PUMP,Valve"), ["Pump", "Valve"], "case-insensitive duplicate removal");
assert.deepEqual(normalizeProfileList("B,A,C"), ["B", "A", "C"], "input order preservation");

assert.equal(validate({ usesExternalWorkforce: false }).ok, true, "usesExternalWorkforce=false should pass");
assert.equal(validate({ hasWorkerRepresentative: false }).ok, true, "hasWorkerRepresentative=false should pass");
expectInvalid("usesExternalWorkforce missing", { usesExternalWorkforce: "" }, "usesExternalWorkforce");
expectInvalid("hasWorkerRepresentative missing", { hasWorkerRepresentative: "" }, "hasWorkerRepresentative");

assert.equal(
  isTenantSiteProfileComplete({
    siteName: "본사 공장",
    industryProfile: "식품 제조업",
    majorProcesses: ["입고"],
    majorEquipment: ["컨베이어"],
    workerCountBand: "50-99명",
    usesExternalWorkforce: false,
    hasWorkerRepresentative: false,
  }),
  true,
  "complete profile should be true",
);
assert.equal(
  isTenantSiteProfileComplete({
    siteName: "본사 공장",
    industryProfile: null,
    majorProcesses: null,
    majorEquipment: null,
    workerCountBand: null,
    usesExternalWorkforce: null,
    hasWorkerRepresentative: null,
  }),
  false,
  "name-only default site should be false",
);

console.log("tenant site profile validation tests passed");
