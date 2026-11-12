import { describe, expect, it } from "vitest";
import { textToHtml, youtubeId } from "./knowledgeApi";

describe("youtubeId", () => {
  it("reads watch, youtu.be, shorts and embed links", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=nIp7ZqrEHyk")).toBe("nIp7ZqrEHyk");
    expect(youtubeId("https://www.youtube.com/watch?feature=share&v=nIp7ZqrEHyk")).toBe("nIp7ZqrEHyk");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("rejects other links", () => {
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("")).toBeNull();
  });
});

describe("textToHtml", () => {
  it("turns blank-line paragraphs into <p> and escapes markup", () => {
    expect(textToHtml("Plant in rows.\n\nWeed at <3> weeks\nthen again")).toBe("<p>Plant in rows.</p><p>Weed at &lt;3&gt; weeks<br>then again</p>");
  });
});
