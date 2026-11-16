import type { Metadata } from "next";
import { ArticleView } from "./components/ArticleView";

export const metadata: Metadata = { title: "Knowledge article | OpenAgriNet" };

export default async function ArticlePage(props: PageProps<"/knowledge/[id]">) {
  const { id } = await props.params;
  return <ArticleView id={decodeURIComponent(id)} />;
}
