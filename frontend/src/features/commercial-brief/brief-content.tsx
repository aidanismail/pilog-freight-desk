import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function BriefContent({ brief }: { brief: string }) {
  return (
    <div className="[&_h1]:mt-[18px] [&_h1]:mb-2.5 [&_h2]:mt-[18px] [&_h2]:mb-2.5 [&_h3]:mt-[18px] [&_h3]:mb-2.5 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_p]:wrap-anywhere [&_li]:wrap-anywhere [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-pilog-action [&_a]:underline">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          )
        }}
      >
        {brief}
      </Markdown>
    </div>
  );
}
