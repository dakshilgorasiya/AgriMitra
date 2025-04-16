import { Sprout } from "lucide-react";
import { motion } from "framer-motion";

const PlantLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white gap-6">
      {/* Shimmering Sprout */}
      <motion.div
        className="relative"
        animate={{
          backgroundPosition: ["-200% 0", "200% 0"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          WebkitMaskImage:
            'url(\'data:image/svg+xml;utf8,<svg fill="black" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 21v-2a7 7 0 0 1 7-7h0a7 7 0 0 1 7 7v2" stroke="black" stroke-width="2.5" fill="none"/><path d="M12 10V3" stroke="black" stroke-width="2.5"/><path d="M12 3c2.5 2.5 6 3 9 3-1 3.5-4 6-9 6S3 9.5 3 6c3 0 6.5-.5 9-3z" stroke="black" stroke-width="2.5" fill="none"/></svg>\')',
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          width: "80px",
          height: "80px",
          backgroundImage:
            "linear-gradient(90deg, #16a34a 0%, #22c55e 50%, #16a34a 100%)",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Tagline */}
      <p className="text-green-700 text-lg font-semibold tracking-wide animate-pulse">
        Nurturing the Future of Farming...
      </p>
    </div>
  );
};

export default PlantLoader;
