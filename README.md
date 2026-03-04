# Stanford Sherlock Computing Cluster Analysis

This repository contains analysis tools and insights for the Stanford Sherlock computing cluster SLURM job data.

## Overview

Analysis of **860,196 SLURM jobs** from **May 23, 2024** to **May 19, 2025** on the Sherlock cluster.

## Key Statistics

### Job Volume & Timing
- **Total Jobs**: 860,196
- **Date Range**: May 23, 2024 - May 19, 2025 (362 days)
- **Average Jobs per Day**: 2,376.2
- **Peak Daily Volume**: 4,218 jobs (May 16, 2025)

### Runtime Characteristics
- **Average Job Duration**: 2.59 hours
- **Median Job Duration**: 0.19 hours (11.4 minutes)
- **75th Percentile**: 1.08 hours
- **Maximum Duration**: 169 hours (~7 days)
- **Total CPU Hours**: 42,884,667.52

### Resource Usage
- **Average CPU Cores per Job**: 9.0
- **GPU Usage**: 32,214 jobs (3.7% of total)
- **Maximum GPU Allocation**: 27 GPUs per job
- **Partition**: All jobs run on 'serc' partition

## Job Success Patterns

### Job States Distribution
- **COMPLETED**: 573,856 jobs (66.71%) 
- **FAILED**: 166,253 jobs (19.33%) 
- **TIMEOUT**: 31,360 jobs (3.65%) 
- **CANCELLED**: Various reasons, totaling ~8.3%
- **OUT_OF_MEMORY**: 4,259 jobs (0.5%) 💾

### Key Insights
- **Success Rate**: 66.7% of jobs complete successfully
- **Failure Rate**: 19.3% of jobs fail (excluding timeouts/cancellations)
- **Resource Issues**: Memory issues affect 0.5% of jobs
- **Timeout Management**: 3.7% of jobs exceed time limits

## User Activity

### User Distribution
- **Total Unique Users**: 336
- **Top User**: 108,982 jobs (12.7% of total)
- **Top 10 Users**: Account for ~50% of all jobs
- **Active Users**: Most users submit hundreds to thousands of jobs

### Top Users by Job Count
1. **User 1**: 108,982 jobs
2. **User 2**: 93,321 jobs  
3. **User 3**: 78,650 jobs
4. **User 4**: 69,395 jobs
5. **User 5**: 42,958 jobs

## Cluster Performance Insights

### Resource Efficiency
- **CPU Utilization**: High average of 9 cores per job suggests compute-intensive workloads
- **GPU Adoption**: Low GPU usage (3.7%) indicates most workloads are CPU-focused
- **Memory Management**: Out-of-memory errors are rare (0.5%)

### Operational Patterns
- **Daily Patterns**: Consistent job submission with some daily variation
- **Job Duration**: Most jobs complete quickly (median <12 minutes)
- **Long-running Jobs**: Few jobs run for extended periods (max 7 days)

## Usage Recommendations

### For Users
- **Job Submission**: Most jobs complete successfully, but 19% fail rate suggests room for improvement
- **Resource Requests**: 9 cores average suggests requesting appropriate CPU resources
- **Timeout Management**: 3.7% timeout rate indicates some jobs need better time estimates
- **Memory Planning**: 0.5% OOM rate suggests generally good memory estimation

### For Administrators
- **Success Rate**: 66.7% completion rate may indicate need for better job validation
- **Resource Allocation**: Consider optimizing for 9-core average usage patterns
- **GPU Resources**: Low utilization suggests potential for better GPU job scheduling
- **Failure Analysis**: Investigate causes of 19% job failure rate

## Data Analysis Tools

### `basic_analyze.py`
- Comprehensive SLURM job analysis script
- Calculates runtime statistics, job distributions, and resource usage
- Prioritizes START/End timestamps over Elapsed time for accuracy
- Generates detailed reports for cluster monitoring

### `visualize.py`
- Data visualization tools for SLURM metrics
- Creates charts and graphs for better understanding of patterns

## Data Schema

The analysis uses the following key columns from SLURM sacct output:
- **START**: Job start timestamp
- **End**: Job end timestamp  
- **Elapsed**: Job duration in seconds (fallback)
- **NCPUS**: Number of CPU cores allocated
- **State**: Job completion state
- **Partition**: Cluster partition used
- **NGPUs**: Number of GPUs allocated
- **hashed_user**: Anonymized user identifier

## Running the Analysis

```bash
# Basic analysis
python basic_analyze.py

# Visualization (if available)
python visualize.py
```

## Notes

- **User Privacy**: User identifiers are hashed for privacy
- **Data Source**: SLURM sacct output from Sherlock cluster
- **Update Frequency**: Analysis covers approximately one year of data
- **Accuracy**: Runtime calculations use START/End timestamps when available

---

*Last Updated: Based on analysis of 860,196 jobs from May 2024 - May 2025*
