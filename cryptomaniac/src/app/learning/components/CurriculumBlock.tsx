'use client';

import React, { useState } from 'react';

interface Lesson {
  title: string;
  duration: string;
}

interface CurriculumBlockProps {
  index: number;
  title: string;
  subtitle: string;
  description: string;
  lessons: Lesson[];
  accentColor?: string;
  isLarge?: boolean;
}

export default function CurriculumBlock({
  index,
  title,
  subtitle,
  description,
  lessons,
  accentColor = '#f59e0b',
  isLarge = false,
}: CurriculumBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredLesson, setHoveredLesson] = useState<number | null>(null);

  const numStr = String(index).padStart(2, '0');

  return (
    <div
      className={`group relative border border-white/[0.07] bg-[#0a0a0a] hover:bg-[#0f0f0f] transition-all duration-500 flex flex-col ${
        isLarge ? 'row-span-2' : ''
      }`}
    >
      {/* Top accent line */}
      <div
        className="h-[2px] w-0 group-hover:w-full transition-all duration-700"
        style={{ backgroundColor: accentColor }}
      />

      <div className="p-8 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <span
            className="text-[11px] font-bold tracking-[0.25em] uppercase"
            style={{ color: `${accentColor}80` }}
          >
            {numStr}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 uppercase tracking-widest border"
            style={{ color: accentColor, borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }}
          >
            {lessons.length} lessons
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-display text-2xl md:text-3xl text-white font-light leading-tight mb-2 group-hover:text-amber-400/90 transition-colors duration-300"
          style={{ '--hover-color': accentColor } as React.CSSProperties}
        >
          {title}
        </h3>
        <p className="text-sm font-display italic text-zinc-600 mb-4">{subtitle}</p>

        {/* Description */}
        <p className="text-sm text-zinc-500 font-light leading-relaxed mb-6 flex-1">
          {description}
        </p>

        {/* Lesson list */}
        <div className={`space-y-0 overflow-hidden transition-all duration-500 ${expanded ? 'max-h-[400px]' : 'max-h-[200px]'}`}>
          {lessons.map((lesson, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-white/[0.05] cursor-pointer group/lesson transition-all duration-200"
              onMouseEnter={() => setHoveredLesson(i)}
              onMouseLeave={() => setHoveredLesson(null)}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold font-mono w-6 transition-colors duration-200"
                  style={{ color: hoveredLesson === i ? accentColor : '#3f3f46' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="text-sm font-medium transition-all duration-200"
                  style={{
                    color: hoveredLesson === i ? accentColor : '#a1a1aa',
                    paddingLeft: hoveredLesson === i ? '4px' : '0px',
                  }}
                >
                  {lesson.title}
                </span>
              </div>
              <span className="text-[11px] text-zinc-700 font-mono flex-shrink-0 ml-2">{lesson.duration}</span>
            </div>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-colors duration-200 self-start"
          style={{ color: expanded ? '#52525b' : accentColor }}
        >
          {expanded ? 'Скрыть' : 'Показать все уроки'}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          >
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}