import { REQ_STATUS_LABELS } from '@polaris/core';
import styles from './Requirements.module.css';
import { useBoard } from '../../hooks/useBoard';
import { requirementsModel } from '../../domain/requirements';
import { systemLabel } from '../../domain/selectors';
import { uiStore } from '../../store/uiStore';
import { RequirementOverview } from './RequirementOverview';
import { RequirementGaps } from './RequirementGaps';
import { RequirementFilters } from './RequirementFilters';
import { RequirementRow } from './RequirementRow';
import { SectionHeading } from '../Shared/Shared';

export function Requirements() {
  const { data, view, ui } = useBoard();
  const model = requirementsModel(data.snapshot?.requirements ?? [], view.tasks, view.systemKey, ui.requirementsFilter);
  const updateFilter = (patch: Partial<typeof ui.requirementsFilter>) =>
    uiStore.setState({ requirementsFilter: { ...ui.requirementsFilter, ...patch } });
  return (
    <main className={styles.requirements} aria-label="需求视图" data-sky-block>
      <SectionHeading>{systemLabel(view)} · 需求概况</SectionHeading>
      <RequirementOverview
        model={model}
        status={ui.requirementsFilter.status}
        onStatus={(status) => updateFilter({ status })}
      />
      <RequirementGaps gaps={model.gaps} />
      <RequirementFilters
        filter={ui.requirementsFilter}
        onChange={updateFilter}
        shown={model.shown}
        total={model.total}
      />
      <section className={styles.pool} aria-label="需求池">
        {!model.total ? (
          <p className={styles.empty}>还没有需求。对 Claude 说‘记一条需求’，或用 /polaris:req。</p>
        ) : !model.shown ? (
          <p className={styles.empty}>没有符合条件的需求，请调整筛选。</p>
        ) : (
          model.groups.map(
            (group) =>
              group.requirements.length > 0 && (
                <section className={styles.group} key={group.status} aria-label={REQ_STATUS_LABELS[group.status]}>
                  <h3>
                    {REQ_STATUS_LABELS[group.status]} <span>{group.requirements.length}</span>
                  </h3>
                  {group.requirements.map((requirement) => (
                    <RequirementRow
                      key={requirement.id}
                      requirement={requirement}
                      tasks={view.tasks}
                      constellation={
                        view.systemKey === 'all'
                          ? view.systems.find((s) => s.key === requirement.systemKey)?.constellation ||
                            requirement.systemKey
                          : undefined
                      }
                    />
                  ))}
                </section>
              ),
          )
        )}
      </section>
    </main>
  );
}
