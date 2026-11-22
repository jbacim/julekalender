/**
 * BELØNNINGSOVERSIGT – én unik dekoration pr. låge 1–23 og stjernen den 24.
 *
 * placement 'tree': position = [vinkel i grader rundt om træet (0 = forfra), højde 0..1 op ad træet]
 * placement 'world': position = [x, z] i verdenen (træet står i 0,0; hytten til venstre bagved)
 * position2D: placering i 2D-fallbacktegningen (viewBox 400 x 300). Træpynt udregnes automatisk,
 * hvis feltet sættes til [0, 0].
 */
import type { RewardDefinition } from '../domain/types';

export const REWARDS: RewardDefinition[] = [
  { day: 1, id: 'rod-julekugle', name: 'Rød julekugle', description: 'En blank, rød kugle der fanger lyset', placement: 'tree', visual: 'ball', colors: ['#c8283c', '#ffd27a'], position: [20, 0.32], position2D: [0, 0] },
  { day: 2, id: 'slikstok', name: 'Slikstok', description: 'Stribet rød og hvid slikstok', placement: 'tree', visual: 'candyCane', colors: ['#f4f1ea', '#d42a3a'], position: [140, 0.5], position2D: [0, 0] },
  { day: 3, id: 'julehjerte', name: 'Flettet julehjerte', description: 'Et flettet hjerte i rødt og hvidt papir', placement: 'tree', visual: 'heart', colors: ['#d1283b', '#f6efe3'], position: [-40, 0.55], position2D: [0, 0] },
  { day: 4, id: 'lanterne', name: 'Lanterne', description: 'En lun lanterne, der lyser på stien', placement: 'world', visual: 'lantern', colors: ['#2b2b33', '#ffc76a'], position: [1.9, 2.1], position2D: [268, 262] },
  { day: 5, id: 'grankogle', name: 'Grankogle', description: 'En lille kogle med sne på spidserne', placement: 'tree', visual: 'pinecone', colors: ['#8a5a32', '#f2f2f2'], position: [80, 0.62], position2D: [0, 0] },
  { day: 6, id: 'guldklokke', name: 'Guldklokke', description: 'En lille klokke i guld', placement: 'tree', visual: 'bell', colors: ['#e3b23c', '#9b6b14'], position: [-120, 0.4], position2D: [0, 0] },
  { day: 7, id: 'flagguirlande', name: 'Flagguirlande', description: 'Små røde og hvide flag snoet om træet', placement: 'tree', visual: 'flagGarland', colors: ['#c8102e', '#ffffff'], position: [0, 0.45], position2D: [0, 0] },
  { day: 8, id: 'snemand', name: 'Snemand', description: 'En glad snemand med gulerodsnæse', placement: 'world', visual: 'snowman', colors: ['#fbfdff', '#f08a24'], position: [3.4, 0.4], position2D: [340, 240] },
  { day: 9, id: 'blaa-glaskugle', name: 'Blå glaskugle', description: 'En skinnende kugle i dybblå', placement: 'tree', visual: 'ball', colors: ['#2f6fd6', '#cfe2ff'], position: [-75, 0.25], position2D: [0, 0] },
  { day: 10, id: 'lyskaede', name: 'Lyskæde', description: 'Varme små lys hele vejen rundt om træet', placement: 'tree', visual: 'lightString', colors: ['#ffd27a', '#ff9f5a'], position: [0, 0.5], position2D: [0, 0] },
  { day: 11, id: 'tromme', name: 'Lille tromme', description: 'En rød tromme med guldkant', placement: 'tree', visual: 'drum', colors: ['#c62f3e', '#e8c15a'], position: [100, 0.22], position2D: [0, 0] },
  { day: 12, id: 'brunkagemand', name: 'Brunkagemand', description: 'En lille kagemand med hvid glasur', placement: 'tree', visual: 'gingerbread', colors: ['#a9652f', '#ffffff'], position: [-160, 0.48], position2D: [0, 0] },
  { day: 13, id: 'rodhals', name: 'Lille rødhals', description: 'En fugl, der sidder på en gren', placement: 'tree', visual: 'bird', colors: ['#7a5236', '#f07a3a'], position: [55, 0.78], position2D: [0, 0] },
  { day: 14, id: 'kane', name: 'Kane', description: 'En rød træ-kane parkeret i sneen', placement: 'world', visual: 'sled', colors: ['#b8262f', '#d9b25a'], position: [-2.3, 2.3], position2D: [118, 268] },
  { day: 15, id: 'snefnug', name: 'Snefnug', description: 'Et glitrende snefnug af sølv', placement: 'tree', visual: 'snowflake', colors: ['#e8f3ff', '#9cc6f0'], position: [-20, 0.72], position2D: [0, 0] },
  { day: 16, id: 'krans', name: 'Krans på hytten', description: 'En grøn krans med rød sløjfe på nissens dør', placement: 'world', visual: 'wreath', colors: ['#2f6b3a', '#c8283c'], position: [-3.6, -1.05], position2D: [74, 214] },
  { day: 17, id: 'istap', name: 'Istap', description: 'En glasistap, der glimter', placement: 'tree', visual: 'icicle', colors: ['#dff1ff', '#a9d4f5'], position: [175, 0.68], position2D: [0, 0] },
  { day: 18, id: 'rensdyr', name: 'Rensdyr', description: 'Et venligt rensdyr på besøg', placement: 'world', visual: 'reindeer', colors: ['#8b5a3c', '#e9d6b8'], position: [3.0, -2.4], position2D: [318, 206] },
  { day: 19, id: 'engel', name: 'Engel', description: 'En lille engel med gyldne vinger', placement: 'tree', visual: 'angel', colors: ['#fdf7ea', '#f2c94c'], position: [15, 0.86], position2D: [0, 0] },
  { day: 20, id: 'fuglebraet', name: 'Fuglebræt', description: 'Et lille fuglebræt med frø til vinterens fugle', placement: 'world', visual: 'birdFeeder', colors: ['#9a6a3e', '#f4f1ea'], position: [1.6, -3.0], position2D: [250, 190] },
  { day: 21, id: 'risengrod', name: 'Skål risengrød', description: 'En skål grød med smørklat til nissen', placement: 'world', visual: 'porridge', colors: ['#3d6db3', '#f7efd9'], position: [-2.9, -0.5], position2D: [104, 238] },
  { day: 22, id: 'lygtepael', name: 'Lygtepæl', description: 'En gammel lygtepæl med varmt lys', placement: 'world', visual: 'lampPost', colors: ['#2d3640', '#ffd68a'], position: [-1.2, 3.0], position2D: [150, 250] },
  { day: 23, id: 'kraemmerhus', name: 'Kræmmerhus', description: 'Et kræmmerhus af glanspapir med godter', placement: 'tree', visual: 'cone', colors: ['#2a8a5a', '#f2c94c'], position: [-100, 0.7], position2D: [0, 0] },
  { day: 24, id: 'stjerne', name: 'Stjernen', description: 'Den gyldne stjerne til toppen af træet', placement: 'tree', visual: 'star', colors: ['#ffd23f', '#fff4b8'], position: [0, 1], position2D: [200, 34] },
];

export function rewardForDay(day: number): RewardDefinition | undefined {
  return REWARDS.find((r) => r.day === day);
}

/** 2D-position for træpynt udregnet fra vinkel/højde (bruges af fallbacktegningen). */
export function treeOrnament2D(r: RewardDefinition): [number, number] {
  if (r.placement !== 'tree') return r.position2D;
  if (r.position2D[0] !== 0 || r.position2D[1] !== 0) return r.position2D;
  const [angle, h] = r.position;
  const baseY = 236;
  const topY = 50;
  const y = baseY - h * (baseY - topY);
  const halfWidth = (1 - h) * 92 + 6;
  const x = 200 + Math.sin((angle * Math.PI) / 180) * halfWidth * 0.82;
  return [Math.round(x), Math.round(y)];
}
