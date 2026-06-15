"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HoverExpand({
  images = [],
  className,
  onItemClick
}) {
  const [activeImage, setActiveImage] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.2,
      }}
      className={cn("relative w-full max-w-6xl px-5 mx-auto", className)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <div className="flex w-full items-center justify-center gap-2 overflow-x-auto py-4">
          {images.map((image, index) => (
            <motion.div
              key={index}
              className="relative cursor-pointer overflow-hidden rounded-3xl shrink-0"
              initial={{ width: "5rem", height: "24rem" }}
              animate={{
                width: activeImage === index ? "24rem" : "5rem",
                height: "24rem",
              }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              onClick={() => {
                setActiveImage(index);
                if (onItemClick) {
                  onItemClick(image, index);
                }
              }}
              onHoverStart={() => setActiveImage(index)}
            >
              <AnimatePresence>
                {activeImage === index && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 h-full w-full bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10"
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {activeImage === index && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="absolute flex h-full w-full flex-col items-start justify-end p-6 z-20 text-white"
                  >
                    {image.caption && (
                      <h4 className="text-xl font-bold tracking-tight mb-1">
                        {image.caption}
                      </h4>
                    )}
                    {image.code && (
                      <p className="text-xs text-white/70 font-medium font-mono">
                        {image.code}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <img
                src={image.url || image.src}
                className="w-full h-full object-cover select-none pointer-events-none"
                alt={image.caption || image.alt || ""}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
export default HoverExpand;
