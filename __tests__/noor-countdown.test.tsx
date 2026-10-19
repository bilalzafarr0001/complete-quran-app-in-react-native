import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { RollingCountdown } from '../src/noor/components/RollingCountdown';

jest.useFakeTimers();

const label = (r: ReactTestRenderer.ReactTestRenderer) =>
  r.root.findAll(n => typeof n.props.accessibilityLabel === 'string')[0].props
    .accessibilityLabel as string;

test('counts down and fires onElapsed once', () => {
  const onElapsed = jest.fn();
  const target = Date.now() + 3000;
  let r!: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    r = ReactTestRenderer.create(
      <RollingCountdown target={target} fontSize={20} onElapsed={onElapsed} />,
    );
  });
  expect(label(r)).toBe('Starts in 00:00:03');

  ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(label(r)).toBe('Starts in 00:00:02');
  expect(onElapsed).not.toHaveBeenCalled();

  ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(5000);
  });
  expect(label(r)).toBe('Starts in 00:00:00');
  expect(onElapsed).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => r.unmount());
});
