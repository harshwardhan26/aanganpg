"use client";

import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { GENDER_PREFERENCES, OCCUPANCY_TYPES, PG_AMENITIES, PG_RULES } from '@/lib/property-options';

import { trackEvent } from '@/lib/posthog';

export function SearchFilters({
  searchParams,
  colleges,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  colleges: { slug: string, name: string }[];
}) {

  const currentCollege = searchParams.college as string | undefined;
  const currentMaxPrice = searchParams.maxPrice as string | undefined;
  const currentGender = searchParams.genderPreference as string | undefined;
  const currentFood = searchParams.food as string | undefined;
  const currentOccupancy = searchParams.occupancy as string | undefined;
  
  const currentAmenities = Array.isArray(searchParams.amenities)
    ? searchParams.amenities
    : typeof searchParams.amenities === 'string'
    ? [searchParams.amenities]
    : [];

  const currentRules = Array.isArray(searchParams.rules)
    ? searchParams.rules
    : typeof searchParams.rules === 'string'
    ? [searchParams.rules]
    : [];

  return (
    <form action="/search" method="get" onSubmit={() => trackEvent('filter_applied')} className="flex flex-col gap-6 px-4 py-4 pb-24 lg:px-0 lg:py-0 lg:pb-0 lg:h-full lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* College Filter */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-main">College</h3>
        <select 
          name="college" 
          defaultValue={currentCollege || ''}
          className="w-full h-12 px-3 py-2 border border-border rounded-lg bg-white text-sm text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Any College</option>
          {colleges.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Sort By */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-main">Sort By</h3>
        <select 
          name="sort" 
          defaultValue={searchParams.sort as string || ''}
          className="w-full h-12 px-3 py-2 border border-border rounded-lg bg-white text-sm text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Relevance</option>
          <option value="price_asc">Price: low to high</option>
        </select>
      </div>

      {/* Budget Filter */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-main">Max Rent (Monthly)</h3>
        <div className="flex flex-wrap gap-2">
          {/* The highlight comes from `has-[:checked]`, not from the URL. The
              radio is sr-only, so styling it off `currentMaxPrice` meant a tap
              changed nothing on screen until the form was submitted — the one
              filter in this sheet with no visible control and no feedback. */}
          {['2000', '3000', '5000', '6000'].map((budget) => (
            <label
              key={budget}
              className="cursor-pointer px-4 py-3 rounded-full border text-sm transition-colors flex items-center justify-center min-h-[48px] border-border text-text-muted hover:border-text-muted has-[:checked]:border-primary-strong has-[:checked]:bg-primary-strong/10 has-[:checked]:text-primary-strong has-[:checked]:font-medium"
            >
              <input
                type="radio"
                name="maxPrice"
                value={budget}
                defaultChecked={currentMaxPrice === budget}
                className="sr-only"
              />
              ₹{Number(budget).toLocaleString()}
            </label>
          ))}
        </div>
      </div>

      {/* Gender Preference */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-main">Gender</h3>
        <div className="flex flex-col">
          {GENDER_PREFERENCES.map((gender) => (
            <label key={gender} className="flex items-center justify-between text-text-main text-sm cursor-pointer py-3 border-b border-border/60 last:border-0">
              <span>{gender === 'Any' ? 'Anyone' : gender}</span>
              <input 
                type="radio" 
                name="genderPreference" 
                value={gender === 'Any' ? '' : gender} 
                defaultChecked={gender === 'Any' ? !currentGender : currentGender === gender}
                className="w-5 h-5 text-primary-strong border-border focus:ring-primary-strong accent-primary-strong" 
              />
            </label>
          ))}
        </div>
      </div>

      {/* Mess / Food */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-main">Mess Included</h3>
        <div className="flex flex-col">
          <label className="flex items-center justify-between text-text-main text-sm cursor-pointer py-3 border-b border-border/60 last:border-0">
            <span>Doesn&apos;t matter</span>
            <input type="radio" name="food" value="" defaultChecked={!currentFood} className="w-5 h-5 text-primary-strong border-border focus:ring-primary-strong accent-primary-strong" />
          </label>
          <label className="flex items-center justify-between text-text-main text-sm cursor-pointer py-3 border-b border-border/60 last:border-0">
            <span>Yes</span>
            <input type="radio" name="food" value="yes" defaultChecked={currentFood === 'yes'} className="w-5 h-5 text-primary-strong border-border focus:ring-primary-strong accent-primary-strong" />
          </label>
          <label className="flex items-center justify-between text-text-main text-sm cursor-pointer py-3 border-b border-border/60 last:border-0">
            <span>No</span>
            <input type="radio" name="food" value="no" defaultChecked={currentFood === 'no'} className="w-5 h-5 text-primary-strong border-border focus:ring-primary-strong accent-primary-strong" />
          </label>
        </div>
      </div>

      {/* Sharing (Occupancy) */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-main">Sharing</h3>
        <select 
          name="occupancy" 
          defaultValue={currentOccupancy || ''}
          className="w-full h-12 px-3 py-2 border border-border rounded-lg bg-white text-sm text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Any</option>
          {OCCUPANCY_TYPES.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Amenities */}
      <details className="group space-y-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-text-main marker:content-none [&::-webkit-details-marker]:hidden">
          Amenities
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col">
          {PG_AMENITIES.map((amenity) => (
            <label key={amenity} className="flex items-center justify-between text-text-main text-sm cursor-pointer py-3 border-b border-border/60 last:border-0">
              <span>{amenity}</span>
              <input 
                type="checkbox" 
                name="amenities" 
                value={amenity} 
                defaultChecked={currentAmenities.includes(amenity)}
                className="w-5 h-5 text-primary-strong rounded border-border focus:ring-primary-strong accent-primary-strong" 
              />
            </label>
          ))}
        </div>
      </details>

      {/* Rules */}
      <details className="group space-y-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-text-main marker:content-none [&::-webkit-details-marker]:hidden">
          Rules
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col">
          {PG_RULES.map((rule) => (
            <label key={rule} className="flex items-center justify-between text-text-main text-sm cursor-pointer py-3 border-b border-border/60 last:border-0">
              <span>{rule}</span>
              <input 
                type="checkbox" 
                name="rules" 
                value={rule} 
                defaultChecked={currentRules.includes(rule)}
                className="w-5 h-5 text-primary-strong rounded border-border focus:ring-primary-strong accent-primary-strong" 
              />
            </label>
          ))}
        </div>
      </details>

      {/* Sticky, not fixed. `fixed` positioned this against the viewport rather
          than the sheet, so it spanned the full width outside the sheet's
          rounded corners and sat over the results page behind it. */}
      <div className="sticky bottom-0 -mx-4 border-t border-border bg-white px-4 py-3 lg:static lg:mx-0 lg:border-none lg:bg-transparent lg:px-0 lg:py-0">
        <Button type="submit" className="w-full bg-primary-strong text-white hover:bg-primary-hover text-base">
          Apply filters
        </Button>
      </div>
    </form>
  );
}
