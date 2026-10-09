import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  type EntitySubscriberInterface,
  type QueryRunner,
  type TransactionCommitEvent,
  type TransactionRollbackEvent,
} from 'typeorm';

@Injectable()
export class AfterCommit implements EntitySubscriberInterface {
  private readonly pending = new WeakMap<QueryRunner, (() => void)[]>();

  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  run(manager: EntityManager | undefined, task: () => void) {
    const runner = manager?.queryRunner;

    if (!runner?.isTransactionActive) {
      task();
      return;
    }

    const tasks = this.pending.get(runner) ?? [];
    tasks.push(task);
    this.pending.set(runner, tasks);
  }

  afterTransactionCommit({ queryRunner }: TransactionCommitEvent) {
    if (queryRunner.isTransactionActive) return;

    const tasks = this.pending.get(queryRunner) ?? [];
    this.pending.delete(queryRunner);

    for (const task of tasks) task();
  }

  afterTransactionRollback({ queryRunner }: TransactionRollbackEvent) {
    if (!queryRunner.isTransactionActive) this.pending.delete(queryRunner);
  }
}
