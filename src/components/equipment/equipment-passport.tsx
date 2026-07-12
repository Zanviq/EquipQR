import type { ReactNode } from "react";
import type { EffectiveStatus } from "@/server/equipment/effective-status";
import { StatusBadge } from "./status-badge";

export function EquipmentPassport(props: {
  name: string;
  assetNumber: string;
  status: EffectiveStatus;
  meta?: string | null;
  children?: ReactNode;
}) {
  return (
    <article className="card equipment-passport">
      <div className="row-between">
        <StatusBadge status={props.status} />
        <span className="font-data equipment-passport-meta">{props.assetNumber}</span>
      </div>
      <h3>{props.name}</h3>
      {props.meta ? <div className="equipment-passport-meta">{props.meta}</div> : null}
      {props.children ? <div className="equipment-passport-actions">{props.children}</div> : null}
    </article>
  );
}
