import pandas as pd
import os
import json
from datetime import datetime

def analyze_slurm_data(file_path=None):
    """
    Analyze SLURM data and return structured data for dashboard visualization.
    
    Args:
        file_path (str): Path to CSV file. If None, uses default path.
    
    Returns:
        dict: Structured data containing all analysis results
    """
    if file_path is None:
        file_path = "/Users/dsun/Downloads/sacct_2024-05-29_to_2025-05-29.csv"
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at {file_path}")
    
    try:
        df = pd.read_csv(file_path)
        
        # Check column availability
        has_start = 'START' in df.columns
        has_end = 'End' in df.columns
        has_elapsed = 'Elapsed' in df.columns
        has_ncpus = 'NCPUS' in df.columns
        has_state = 'State' in df.columns
        
        # Initialize results dictionary
        results = {
            'metadata': {
                'total_jobs': len(df),
                'date_range': {},
                'columns_available': {
                    'START': has_start,
                    'End': has_end,
                    'Elapsed': has_elapsed,
                    'NCPUS': has_ncpus,
                    'State': has_state
                }
            },
            'runtime_analysis': {},
            'job_states': {},
            'resource_usage': {},
            'user_analysis': {},
            'partition_analysis': {},
            'gpu_analysis': {},
            'daily_patterns': {}
        }
        
        # Process datetime columns if available
        if has_start and has_end:
            df["START"] = pd.to_datetime(df["START"])
            df["End"] = pd.to_datetime(df["End"])
            df["Duration"] = (df["End"] - df["START"]).dt.total_seconds() / 3600  # hours
            
            # Runtime statistics
            duration_stats = df["Duration"].describe()
            results['runtime_analysis'] = {
                'method': 'START_End',
                'statistics': {
                    'count': int(duration_stats['count']),
                    'mean': float(duration_stats['mean']),
                    'std': float(duration_stats['std']),
                    'min': float(duration_stats['min']),
                    '25%': float(duration_stats['25%']),
                    '50%': float(duration_stats['50%']),
                    '75%': float(duration_stats['75%']),
                    'max': float(duration_stats['max'])
                }
            }
            
            # Daily patterns
            jobs_per_day = df.groupby(df["START"].dt.date).size()
            results['daily_patterns'] = {
                'dates': [str(date) for date in jobs_per_day.index],
                'job_counts': jobs_per_day.values.tolist(),
                'average_jobs_per_day': float(len(df) / len(jobs_per_day))
            }
            
            # Date range
            results['metadata']['date_range'] = {
                'start': df['START'].min().isoformat(),
                'end': df['START'].max().isoformat(),
                'total_days': len(jobs_per_day)
            }
            
            # CPU Hours calculation
            if has_ncpus:
                df["CPUHours"] = df["Duration"] * df["NCPUS"]
                total_cpu_hours = df["CPUHours"].sum()
                results['resource_usage']['cpu_hours'] = {
                    'total': float(total_cpu_hours),
                    'average_per_job': float(total_cpu_hours / len(df))
                }
        
        # Alternative: Use Elapsed column ONLY if START/End is not available
        elif has_elapsed:
            df["ElapsedHours"] = df["Elapsed"] / 3600
            elapsed_stats = df["ElapsedHours"].describe()
            
            results['runtime_analysis'] = {
                'method': 'Elapsed',
                'statistics': {
                    'count': int(elapsed_stats['count']),
                    'mean': float(elapsed_stats['mean']),
                    'std': float(elapsed_stats['std']),
                    'min': float(elapsed_stats['min']),
                    '25%': float(elapsed_stats['25%']),
                    '50%': float(elapsed_stats['50%']),
                    '75%': float(elapsed_stats['75%']),
                    'max': float(elapsed_stats['max'])
                }
            }
            
            # Try to get date information from Submit column
            if 'Submit' in df.columns:
                try:
                    df["Submit"] = pd.to_datetime(df["Submit"])
                    jobs_per_day = df.groupby(df["Submit"].dt.date).size()
                    results['daily_patterns'] = {
                        'dates': [str(date) for date in jobs_per_day.index],
                        'job_counts': jobs_per_day.values.tolist(),
                        'average_jobs_per_day': float(len(df) / len(jobs_per_day))
                    }
                    results['metadata']['date_range'] = {
                        'start': df['Submit'].min().isoformat(),
                        'end': df['Submit'].max().isoformat(),
                        'total_days': len(jobs_per_day)
                    }
                except:
                    pass
        
        # Job states analysis
        if has_state:
            state_counts = df["State"].value_counts()
            state_percentages = (state_counts / len(df) * 100).round(2)
            
            results['job_states'] = {
                'total_states': len(state_counts),
                'states': [
                    {
                        'state': str(state),
                        'count': int(count),
                        'percentage': float(percentage)
                    }
                    for state, count, percentage in zip(state_counts.index, state_counts.values, state_percentages.values)
                ]
            }
        
        # Resource usage analysis
        if has_ncpus:
            ncpus_stats = df["NCPUS"].describe()
            results['resource_usage']['cpu_cores'] = {
                'statistics': {
                    'mean': float(ncpus_stats['mean']),
                    'std': float(ncpus_stats['std']),
                    'min': int(ncpus_stats['min']),
                    '25%': float(ncpus_stats['25%']),
                    '50%': float(ncpus_stats['50%']),
                    '75%': float(ncpus_stats['75%']),
                    'max': int(ncpus_stats['max'])
                }
            }
        
        # Partition analysis
        if 'Partition' in df.columns:
            partition_counts = df["Partition"].value_counts()
            results['partition_analysis'] = {
                'total_partitions': len(partition_counts),
                'partitions': [
                    {
                        'partition': str(partition),
                        'count': int(count),
                        'percentage': float(count / len(df) * 100)
                    }
                    for partition, count in partition_counts.items()
                ]
            }
        
        # User analysis
        if 'hashed_user' in df.columns:
            user_counts = df["hashed_user"].value_counts()
            results['user_analysis'] = {
                'total_users': len(user_counts),
                'top_users': [
                    {
                        'user_id': str(user_id),
                        'job_count': int(count),
                        'percentage': float(count / len(df) * 100)
                    }
                    for user_id, count in user_counts.head(20).items()
                ]
            }
        
        # GPU analysis
        if 'NGPUs' in df.columns:
            gpu_stats = df["NGPUs"].describe()
            gpu_jobs = df[df["NGPUs"] > 0]
            
            results['gpu_analysis'] = {
                'statistics': {
                    'mean': float(gpu_stats['mean']),
                    'std': float(gpu_stats['std']),
                    'min': int(gpu_stats['min']),
                    '25%': float(gpu_stats['25%']),
                    '50%': float(gpu_stats['50%']),
                    '75%': float(gpu_stats['75%']),
                    'max': int(gpu_stats['max'])
                },
                'gpu_jobs': {
                    'count': int(len(gpu_jobs)),
                    'percentage': float(len(gpu_jobs) / len(df) * 100)
                }
            }
        
        return results
        
    except Exception as e:
        raise Exception(f"Error processing data: {e}")

def save_analysis_to_json(results, output_file="slurm_analysis.json"):
    """Save analysis results to JSON file for frontend consumption."""
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Analysis results saved to {output_file}")

def print_summary(results):
    """Print a brief summary of key findings."""
    print(f"=== SLURM Analysis Summary ===")
    print(f"Total Jobs: {results['metadata']['total_jobs']:,}")
    
    if results['metadata']['date_range']:
        print(f"Date Range: {results['metadata']['date_range']['start'][:10]} to {results['metadata']['date_range']['end'][:10]}")
        print(f"Total Days: {results['metadata']['date_range']['total_days']}")
    
    if results['daily_patterns']:
        print(f"Average Jobs per Day: {results['daily_patterns']['average_jobs_per_day']:.1f}")
    
    if results['runtime_analysis']:
        method = results['runtime_analysis']['method']
        stats = results['runtime_analysis']['statistics']
        print(f"Runtime Analysis ({method}):")
        print(f"  Average Duration: {stats['mean']:.2f} hours")
        print(f"  Median Duration: {stats['50%']:.2f} hours")
    
    if results['job_states']:
        completed = next((s for s in results['job_states']['states'] if 'COMPLETED' in s['state']), None)
        if completed:
            print(f"Success Rate: {completed['percentage']:.1f}%")
    
    if results['resource_usage'].get('cpu_hours'):
        print(f"Total CPU Hours: {results['resource_usage']['cpu_hours']['total']:,.0f}")

if __name__ == "__main__":
    try:
        # Run analysis
        results = analyze_slurm_data()
        
        # Save to JSON for frontend
        save_analysis_to_json(results)
        
        # Print summary
        print_summary(results)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
