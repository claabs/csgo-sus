// eslint-disable-next-line import/no-extraneous-dependencies
import { plot, stack } from 'nodeplotlib';

import { accountAgePlot } from '../analyze/account-age';
import { compMatchWinsPlot } from '../analyze/comp-match-count';
import { friendBansPlot } from '../analyze/friend-bans';
import { gameHoursPlot } from '../analyze/game-hours';
import { rankPlot } from '../analyze/rank';

export const generateCharts = async (): Promise<void> => {
  const plots = [accountAgePlot, compMatchWinsPlot, gameHoursPlot, rankPlot, friendBansPlot].flat();
  plots.forEach((plotElem) => {
    stack([{ x: plotElem.x, y: plotElem.y, type: 'scatter' }], {
      title: plotElem.title,
      xaxis: { title: { text: plotElem.xAxisLabel } },
      yaxis: { title: { text: plotElem.yAxisLabel || 'Score' } },
    });
  });
  plot();
};

generateCharts();
