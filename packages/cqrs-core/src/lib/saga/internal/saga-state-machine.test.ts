import { SagaStateMachine } from './saga-state-machine';

describe('SagaStateMachine', () => {
  let stateMachine: SagaStateMachine;

  beforeEach(() => {
    stateMachine = new SagaStateMachine();
  });

  test('should start in the idle state', () => {
    expect(stateMachine.state).toBe('idle');
  });

  test('should transition to running state', () => {
    stateMachine.transition({ type: 'run' });
    expect(stateMachine.state).toBe('running');
  });

  test('should transition to completed state', () => {
    stateMachine.transition({ type: 'run' });
    stateMachine.transition({ type: 'complete' });
    expect(stateMachine.state).toBe('completed');
  });

  test('should transition to error state', () => {
    stateMachine.transition({ type: 'run' });
    stateMachine.transition({ type: 'error' });
    expect(stateMachine.state).toBe('failed');
  });

  test('should transition to compensated state', () => {
    stateMachine.transition({ type: 'run' });
    stateMachine.transition({ type: 'error' });
    stateMachine.transition({ type: 'compensate' });
    expect(stateMachine.state).toBe('compensated');
  });

  test('should throw an error when transitioning from an invalid state', () => {
    expect(() => {
      stateMachine.transition({ type: 'complete' });
    }).toThrowError('Invalid transition');
  });
});
