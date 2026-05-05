import Slider from "rc-slider";
import "rc-slider/assets/index.css";

const sliderTrack = {
  backgroundColor: '#ec4899',
  height: 4,
  borderRadius: 999,
};

const sliderHandle = {
  borderColor: '#db2777',
  backgroundColor: '#fff',
  height: 14,
  width: 14,
  marginTop: -5,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const sliderRail = {
  backgroundColor: '#e5e7eb',
  height: 4,
  borderRadius: 999,
};

export function RangeSlider({ label, icon, min, max, value, onChange }) {
  return (
    <div className="flex flex-col gap-2 col-span-2">
      <div className="px-2">
        <Slider
          range
          min={min}
          max={max}
          step={1}
          allowCross={false}
          value={value}
          onChange={onChange}
          trackStyle={[sliderTrack]}
          handleStyle={[sliderHandle, sliderHandle]}
          railStyle={sliderRail}
        />
      </div>
    </div>
  );
}