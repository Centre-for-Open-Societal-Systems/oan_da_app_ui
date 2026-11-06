import { describe, expect, it } from "vitest";
import type { GeoArea, GeoField } from "./api";
import { geoCascadeReducer, initialGeoCascade, type GeoAction, type GeoCascade } from "./geoCascade";

const area = (code: string, name: string, field_name: GeoField, parent: string): GeoArea => ({ id: code, code, name, field_name, parent, sort_order: 0 });

const gambela = area("ET12", "Gambela", "region", "ET");
const oromia = area("ET04", "Oromia", "region", "ET");
const agnewak = area("ET1202", "Agnewak", "zone", "ET12");
const dima = area("ET120205", "Dima (Gm)", "woreda", "ET1202");

const run = (actions: GeoAction[], from: GeoCascade = initialGeoCascade) => actions.reduce(geoCascadeReducer, from);

const regionsLoaded: GeoAction = { type: "loaded", field: "region", parent: "ET", rows: [gambela, oromia] };
const zonesLoaded: GeoAction = { type: "loaded", field: "zone", parent: "ET12", rows: [agnewak] };
const woredasLoaded: GeoAction = { type: "loaded", field: "woreda", parent: "ET1202", rows: [dima] };
const pickRegion = (code = "ET12"): GeoAction => ({ type: "select", field: "region", code });
const pickZone: GeoAction = { type: "select", field: "zone", code: "ET1202" };
const pickWoreda: GeoAction = { type: "select", field: "woreda", code: "ET120205" };

const allChosen = run([regionsLoaded, pickRegion(), zonesLoaded, pickZone, woredasLoaded, pickWoreda]);

describe("geo cascade", () => {
  it("starts with the Regions of the country loading and nothing below them", () => {
    expect(initialGeoCascade.region).toMatchObject({ parent: "ET", status: "loading" });
    expect(initialGeoCascade.zone).toMatchObject({ parent: null, status: "idle" });
    expect(initialGeoCascade.woreda).toMatchObject({ parent: null, status: "idle" });
  });

  it("follows the parent chain from Region to Woreda", () => {
    const zones = run([regionsLoaded, pickRegion()]);
    expect(zones.zone).toMatchObject({ parent: "ET12", status: "loading" });
    expect(zones.woreda.parent).toBeNull();

    const woredas = run([zonesLoaded, pickZone], zones);
    expect(woredas.woreda).toMatchObject({ parent: "ET1202", status: "loading" });
  });

  it("keeps the code and name of the chosen Woreda", () => {
    expect(allChosen.woreda.selected).toMatchObject({ code: "ET120205", name: "Dima (Gm)" });
  });

  it("clears Zone and Woreda when the Region changes, and loads the new Region's Zones", () => {
    const next = run([pickRegion("ET04")], allChosen);
    expect(next.zone).toMatchObject({ parent: "ET04", status: "loading", selected: null, options: [] });
    expect(next.woreda).toMatchObject({ parent: null, status: "idle", selected: null, options: [] });
  });

  it("clears the Woreda when the Zone changes, and keeps the Region", () => {
    const next = run([{ type: "select", field: "zone", code: "" }], allChosen);
    expect(next.region.selected?.code).toBe("ET12");
    expect(next.zone.selected).toBeNull();
    expect(next.woreda).toMatchObject({ parent: null, status: "idle", selected: null, options: [] });
  });

  it("closes both lower levels when the Region is cleared", () => {
    const next = run([pickRegion("")], allChosen);
    expect(next.zone).toMatchObject({ parent: null, status: "idle" });
    expect(next.woreda).toMatchObject({ parent: null, status: "idle" });
  });

  it("ignores a late response from an earlier choice", () => {
    const waitingForOromia = run([regionsLoaded, pickRegion("ET12"), pickRegion("ET04")]);

    expect(run([zonesLoaded], waitingForOromia).zone).toMatchObject({ parent: "ET04", status: "loading", options: [] });
    expect(run([{ type: "failed", field: "zone", parent: "ET12", message: "late" }], waitingForOromia).zone).toMatchObject({ status: "loading", error: null });
  });

  it("drops a late response once its level has been closed", () => {
    const closed = run([regionsLoaded, pickRegion(), pickRegion("")]);
    expect(run([zonesLoaded], closed).zone).toMatchObject({ status: "idle", options: [] });
  });

  it("shows the backend message on a failure and loads the same parent again on retry", () => {
    const failed = run([regionsLoaded, pickRegion(), { type: "failed", field: "zone", parent: "ET12", message: "Master Data is unavailable." }]);
    expect(failed.zone).toMatchObject({ status: "error", error: "Master Data is unavailable.", attempt: 0 });

    const retrying = run([{ type: "retry", field: "zone" }], failed);
    expect(retrying.zone).toMatchObject({ parent: "ET12", status: "loading", error: null, attempt: 1 });
    expect(run([zonesLoaded], retrying).zone).toMatchObject({ status: "ready", options: [agnewak] });
  });
});
