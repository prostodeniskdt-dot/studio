export function LoginAnimation() {
  return (
    <svg
      width="250"
      height="250"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="animation-container"
    >
      <defs>
        <clipPath id="liquidClip">
          <path d="M75 50 H125 V140 Q125 150 115 150 H85 Q75 150 75 140Z" />
        </clipPath>
      </defs>

      {/* Bottle */}
      <g className="bottle-group">
        <path
          d="M75 50 H125 V140 Q125 150 115 150 H85 Q75 150 75 140Z"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          fill="none"
        />
        <rect x="70" y="40" width="60" height="10" rx="3" stroke="hsl(var(--primary))" strokeWidth="2" fill="hsl(var(--primary))" />
        
        {/* Liquid inside bottle */}
        <rect
          className="liquid"
          x="75"
          y="60"
          width="50"
          height="85"
          fill="hsl(var(--primary) / 0.8)"
          clipPath="url(#liquidClip)"
        />
      </g>
      
      {/* Stream */}
      <path
        className="stream"
        d="M65 80 C 65 120, 90 130, 90 160"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Bar Chart */}
      <g className="bar-chart" transform="translate(0, 200) scale(1, -1)">
        <rect className="bar bar1" x="60" y="0" width="20" height="0" fill="hsl(var(--primary))" rx="2"/>
        <rect className="bar bar2" x="90" y="0" width="20" height="0" fill="hsl(var(--primary))" rx="2"/>
        <rect className="bar bar3" x="120" y="0" width="20" height="0" fill="hsl(var(--primary))" rx="2"/>
      </g>
      <line x1="50" y1="180" x2="150" y2="180" stroke="hsl(var(--primary))" strokeWidth="2"/>
    </svg>
  );
}

    