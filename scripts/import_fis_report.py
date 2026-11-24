"""Import a FIS PDF into the backend market snapshot directory."""
import argparse
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from pilog_cfr_dss.sources.fis import parse_report, save_report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    print(save_report(parse_report(args.report), ROOT / "data/market_snapshots/fis"))


if __name__ == "__main__":
    main()
