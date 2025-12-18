"use client";

import { registerChaiBlock, registerChaiBlockSchema } from "@chaibuilder/nextjs/blocks";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useEffect } from "react";
import { cn } from "../lib/utils";

export const TypewriterEffect = ({ words }: { words: string }) => {
  // split text inside of words into array of characters
  const wordsArray = words.split(" ");

  const [scope, animate] = useAnimate();
  const isInView = useInView(scope);
  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          display: "inline-block",
          opacity: 1,
          width: "fit-content",
        },
        {
          duration: 0.3,
          delay: stagger(0.1),
          ease: "easeInOut",
        },
      );
    }
  }, [animate, isInView]);

  const renderWords = () => {
    return (
      <motion.div ref={scope} className="inline">
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block">
              {wordsArray.map((char, index) => (
                <motion.span
                  initial={{}}
                  key={`char-${index}`}
                  className={cn(`hidden text-black opacity-0 dark:text-white`)}>
                  {char}
                </motion.span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </motion.div>
    );
  };
  return (
    <div className={cn("text-center text-base font-bold sm:text-xl md:text-3xl lg:text-5xl")}>
      {renderWords()}
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn("inline-block h-4 w-[4px] rounded-sm bg-blue-500 md:h-6 lg:h-10")}></motion.span>
    </div>
  );
};

export const TypewriterEffectSmooth = ({ words }: { words: string }) => {
  // split text inside of words into array of characters
  const wordsArray = words.split(" ");
  const renderWords = () => {
    return (
      <div>
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block">
              {wordsArray.map((char, index) => (
                <span key={`char-${index}`} className={cn(`text-black dark:text-white`)}>
                  {char}
                </span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("my-6 flex space-x-1")}>
      <motion.div
        className="overflow-hidden pb-2"
        initial={{
          width: "0%",
        }}
        whileInView={{
          width: "fit-content",
        }}
        transition={{
          duration: 2,
          ease: "linear",
          delay: 1,
        }}>
        <div
          className="lg:text:3xl text-xs font-bold sm:text-base md:text-xl xl:text-5xl"
          style={{
            whiteSpace: "nowrap",
          }}>
          {renderWords()}{" "}
        </div>{" "}
      </motion.div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,

          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn("block h-4 w-[4px] rounded-sm bg-blue-500 sm:h-6 xl:h-12")}></motion.span>
    </div>
  );
};

registerChaiBlock(TypewriterEffectSmooth, {
  type: "Aceternity/TypewriterEffect",
  label: "Typewriter Effect",
  category: "core",
  group: "Aceternity",
  ...registerChaiBlockSchema({
    properties: {
      words: {
        type: "string",
        title: "Words",
        default: "Some test",
      },
    },
  }),
});
