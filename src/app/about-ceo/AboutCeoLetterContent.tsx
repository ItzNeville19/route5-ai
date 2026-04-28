import { Fragment } from "react";
import {
  ABOUT_CEO_CHAPTER_OPENERS,
  ABOUT_CEO_LETTER_BIO,
  ABOUT_CEO_LETTER_BODY,
} from "./aboutCeoLetterSource";

function BrLines({ text }: { text: string }) {
  const lines = text.split("\n");
  return lines.map((line, j) => (
    <Fragment key={j}>
      {j > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

export function AboutCeoLetterContent() {
  const blocks = ABOUT_CEO_LETTER_BODY.trim().split(/\n\n+/);

  const bioLines = ABOUT_CEO_LETTER_BIO.trim().split("\n");

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0] ?? "";
        const restLines = lines.slice(1);
        if (ABOUT_CEO_CHAPTER_OPENERS.has(first) && restLines.length > 0) {
          return (
            <p key={i} className="mb-[1.25em] text-[17px] leading-[1.72] text-[#1d1d1f] md:text-[18px] md:leading-[1.74]">
              <span className="about-ceo-chapter-label">{first}</span>
              <br />
              <BrLines text={restLines.join("\n")} />
            </p>
          );
        }
        return (
          <p
            key={i}
            className="mb-[1.25em] text-[17px] leading-[1.72] text-[#1d1d1f] last:mb-0 md:text-[18px] md:leading-[1.74]"
          >
            <BrLines text={block} />
          </p>
        );
      })}

      <div className="about-ceo-bio-rail mt-16 border-t border-black/[0.08] pt-10">
        {bioLines.map((line, i) => {
          if (line === "Route5 AI is live at route5ai.vercel.app.") {
            return (
              <p
                key={i}
                className="mb-[1.1em] text-[17px] leading-[1.72] text-[#424245] md:text-[18px] md:leading-[1.74] last:mb-0"
              >
                Route5 AI is live at{" "}
                <a
                  href="https://route5ai.vercel.app"
                  className="font-medium text-[#0071e3] underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  route5ai.vercel.app
                </a>
                .
              </p>
            );
          }
          return (
            <p
              key={i}
              className="mb-[1.1em] text-[17px] leading-[1.72] text-[#424245] md:text-[18px] md:leading-[1.74] last:mb-0"
            >
              {line}
            </p>
          );
        })}
      </div>
    </>
  );
}
