# Blind implementation readings

This implementation was written from `input/SPEC.md` and
`input/schema/transmission.schema.json` only, after reading `PROMPT.txt`.
No reference implementation, official test, fixture, result, sibling trial,
repository guidance, or network resource was consulted.

1. **The schema still identifies 0.3 and excludes witness replays.** Its replay
   enum contains only `sufficiency` and `quote` and has no `produced` property.
   Section 7.6 explicitly adds both in 0.4, so the implementation supports them.
   The seven behavioural checks are not expanded into a general schema validator.

2. **The record-check table omits the 0.4 additions.** Sections 4.2.1 and 11.4
   supply `invalid-witness` and `verification-unsupported`, but do not repeat
   their full rules in 7.3. Both receive the field reference suffix, following
   other derivation diagnostics. A witness is valid when it is a non-empty
   array of objects with own `input` and `output` members. Additional members
   are allowed, as the witness schema allows them.

3. **What constitutes unsupported verification.** A present `verifiedOn`
   member is treated as a declared claim. The warning is emitted whenever
   that derivation lacks a valid non-empty witness, including empty or malformed
   witnesses; malformed witnesses also produce `invalid-witness:F`. Section
   7.3 does not add `verifiedOn` to the listed `invalid-derivation` string
   checks, so its malformed type alone does not invent another violation.

4. **Witness replay failure details are incomplete.** An absent or empty
   witness produces `witness-undeclared`; a present non-array or malformed
   member produces `witness-invalid`. The produced-array requirement is
   checked separately, so it can add `replay-produced-invalid` on the same
   input. Following the unconditional result-shape sentence, every replay
   with method `witness` includes `cases`. On invalid input its `matched` is
   zero and `total` is the witness array length, or zero if there is no array.
   `self-refuting-witness` is only emitted for a valid, refuted replay.

5. **Order independence conflicts with exact JSON equality and digests.**
   Dependency traversal, indexing, diagnostics, counts and returned id lists
   do not depend on collection arrival order. However, sections 2 and 3.2
   explicitly retain array order in JSON equality, section 7.4 requires kept
   fields to be JSON-equal ignoring only `expect`, and 7.5 binds the canonical
   receipt itself. Accordingly, source arrays inside a compared carried field
   retain their JSON order, and permuting an already committed receipt requires
   recomputing its digest. Deep-copied dispute inputs also retain their arrays
   rather than applying the general instruction to sort returned arrays.

6. **Unrelated lineage defects.** Section 7.1 step 4 mentions problems from
   unrelated fields. The algorithm checks all ids globally, but evaluates
   provenance and root channel declarations only along the two compared paths.
   Thus an unrelated duplicate id blocks the result; an unrelated field with
   malformed sources is not traversed or otherwise validated by this check.

7. **Duplicate exclusion applies to subsequent object checks.** After ids are
   indexed, all occurrences of an invalid or repeated id are excluded from
   per-field and per-objection checks and from reference resolution. The
   appropriate index diagnostic remains. Reveal checking uses the same
   exclusion rule for sent and received fields, without inventing a diagnostic
   for those arrays because 7.5 provides none; malformed reveal-item ids do
   receive its specified diagnostic.

8. **Absent versus malformed collections.** Missing/non-array collections
   are empty where a check merely consumes a collection. Explicit predicates
   take precedence: `sources` and derivation arrays still fail the validity
   checks that require actual arrays. An object is a non-null, non-array JSON
   object. Missing or malformed top-level objects are treated as empty for
   checking. Dispute `original` and `objection` preserve copies of the actual
   supplied inputs, including `undefined` if an input was absent.

9. **Checks are bounded by their enumerated diagnostics.** `inspectRecord`
   does not add unspecified errors for missing parent/actor, arbitrary extra
   properties, duplicate source entries, or bad date strings. It warns about
   an absent observed channel and about an undeclared upstream on a valid
   non-direct observed channel, following 7.3 despite the broader sender MUST.
   `inspectHop` does not run the full record check on the received record and
   does not invent a receipt-target diagnostic.

10. **Accumulating failures versus stopping.** Where a step explicitly says
    to skip or move to the next field, it does so. Otherwise independent
    predicates can each produce a diagnostic. In particular, a quoted
    derivation with an invalid quote/locator can have both
    `invalid-derivation:F` and `quote-missing:F`; only
    `derivation-inconsistent:F` requires the derivation to be valid first.
    Replay checks stop method validation when its field or derivation object
    is unavailable, but always report the replayer-lineage warning. Any replay
    problem, including unrelated `record-invalid`, prevents reproduction.

11. **Reveal selection with duplicate dispositions.** Section 7.5 selects
    sorted unique field ids from all `re_derive` dispositions on indexed
    sealed sent fields. It does not reuse hop's duplicate-disposition rejection
    because the reveal algorithm does not specify that dependency. Extra
    well-identified reveal items are ignored unless selected; their duplicate
    or invalid ids still trigger the explicitly global reveal-item rule.

12. **Non-JSON JavaScript inputs.** The checks target JSON objects. For defensive
    canonicalization, undefined, non-finite numbers, BigInt, functions, symbols,
    cyclic values, array holes and objects with non-JSON prototypes are rejected.
    They are JSON-equal to nothing and cannot form a matching digest. Shared
    acyclic subobjects are allowed. Ordinary strings and finite numbers use
    ECMAScript serialization, including the permitted string escaping and
    negative-zero normalization; object keys are emitted in UTF-16 order.

## Self-validation

`node --test blind/selftest.mjs` passed all 16 self-written test groups on
Node.js v24.19.0. They cover canonical equality, all seven public checks,
diagnostic families, commitment and receipt binding, witness outcomes,
frozen-input nonmutation, and representative order permutations. Every `.mjs`
file has fewer than 300 lines. These results make no claim about the official
conformance suite, which was not available to this implementation.
