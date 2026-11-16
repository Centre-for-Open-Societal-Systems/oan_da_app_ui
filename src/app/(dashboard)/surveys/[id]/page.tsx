import type { Metadata } from "next";
import { SurveyCapture } from "./components/SurveyCapture";

export const metadata: Metadata = {
  title: "Survey | OpenAgriNet",
  description: "Capture one farmer's survey response.",
};

// The survey is read from DA Services with the signed-in user's token, so the capture screen loads it on the client.
export default async function SurveyCapturePage(props: PageProps<"/surveys/[id]">) {
  const { id } = await props.params;
  return <SurveyCapture id={id} />;
}
